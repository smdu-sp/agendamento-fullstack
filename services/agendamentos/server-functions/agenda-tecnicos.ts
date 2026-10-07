"use server";

import { ModalidadeAgendamento } from "@prisma/client";
import { AuthzError, requireUsuario, verificarPermissoes } from "@/lib/authz";
import { usuarioPodeSerTecnicoAtribuido } from "@/lib/agendamentos-core";
import { consultarSlotsTecnico, criarAusenciaTecnico, criarRegraAgenda, dataCivil } from "@/lib/agenda-tecnicos";
import { prisma } from "@/lib/prisma";

async function autorizarTecnico(tecnicoId: string) {
  const usuario = await requireUsuario();
  verificarPermissoes(usuario, ["ADM", "DEV", "TEC", "PONTO_FOCAL", "COORDENADOR"]);
  const tecnico = await prisma.usuario.findUnique({ where: { id: tecnicoId }, select: {
    id: true, status: true, permissao: true, divisaoId: true,
    divisao: { select: { coordenadoriaId: true } },
  } });
  if (!tecnico || !tecnico.status || !usuarioPodeSerTecnicoAtribuido(tecnico)) {
    throw new AuthzError("Técnico ativo não encontrado.", 404);
  }
  if (usuario.permissao === "TEC" && usuario.id !== tecnicoId && usuario.permissaoReal !== "DEV") {
    throw new AuthzError("Você só pode consultar sua própria agenda.", 403);
  }
  if (["PONTO_FOCAL", "COORDENADOR"].includes(usuario.permissao) && usuario.permissaoReal !== "DEV") {
    const coord = usuario.divisao?.coordenadoriaId;
    if (!coord || tecnico.divisao?.coordenadoriaId !== coord) {
      throw new AuthzError("Técnico fora da sua coordenadoria.", 403);
    }
  }
  return usuario;
}

export async function listarAgendaTecnico(tecnicoId: string) {
  await autorizarTecnico(tecnicoId);
  const [regras, ausencias] = await Promise.all([
    prisma.agendaTecnico.findMany({ where: { tecnicoId }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] }),
    prisma.ausenciaTecnico.findMany({ where: { tecnicoId }, orderBy: { dataHoraInicio: "desc" }, take: 100 }),
  ]);
  return { regras, ausencias };
}

export async function listarTecnicosAgenda() {
  const usuario = await requireUsuario();
  verificarPermissoes(usuario, ["ADM", "DEV", "TEC", "PONTO_FOCAL", "COORDENADOR"]);
  const propria = usuario.permissao === 'TEC' && usuario.permissaoReal !== 'DEV';
  const coordenadoria = ['PONTO_FOCAL', 'COORDENADOR'].includes(usuario.permissao) && usuario.permissaoReal !== 'DEV'
    ? usuario.divisao?.coordenadoriaId : undefined;
  if (['PONTO_FOCAL', 'COORDENADOR'].includes(usuario.permissao) && usuario.permissaoReal !== 'DEV' && !coordenadoria) return [];
  return prisma.usuario.findMany({ where: {
    status: true,
    OR: [{ permissao: 'TEC' }, { permissao: 'DEV', divisaoId: { not: null } }],
    ...(propria ? { id: usuario.id } : {}),
    ...(coordenadoria ? { divisao: { coordenadoriaId: coordenadoria } } : {}),
  }, select: { id: true, nome: true, login: true, divisao: { select: { sigla: true } } }, orderBy: { nome: 'asc' } });
}

export async function alterarAtividadeRegraAgenda(id: string, ativo: boolean) {
  const regra = await prisma.agendaTecnico.findUnique({ where: { id } });
  if (!regra) throw new Error('Regra não encontrada.');
  const usuario = await autorizarTecnico(regra.tecnicoId);
  verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${regra.tecnicoId} FOR UPDATE`;
    if (ativo) {
      const outras = await tx.agendaTecnico.findMany({ where: {
        id: { not: id }, tecnicoId: regra.tecnicoId, diaSemana: regra.diaSemana,
        modalidade: regra.modalidade, ativo: true,
        vigenciaInicio: { lte: regra.vigenciaFim ?? new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: regra.vigenciaInicio } }],
      }, select: { horaInicio: true, horaFim: true } });
      if (outras.some((item) => item.horaInicio < regra.horaFim && regra.horaInicio < item.horaFim)) {
        throw new Error('Esta faixa se sobrepõe a outra regra ativa do técnico.');
      }
    }
    return tx.agendaTecnico.update({ where: { id }, data: { ativo } });
  });
}

export async function alterarAtividadeAusencia(id: string, ativo: boolean) {
  const ausencia = await prisma.ausenciaTecnico.findUnique({ where: { id }, select: { tecnicoId: true } });
  if (!ausencia) throw new Error('Ausência não encontrada.');
  const usuario = await autorizarTecnico(ausencia.tecnicoId);
  verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${ausencia.tecnicoId} FOR UPDATE`;
    return tx.ausenciaTecnico.update({ where: { id }, data: { ativo } });
  });
}

export async function consultarDisponibilidadeTecnico(tecnicoId: string, data: string, modalidade: ModalidadeAgendamento) {
  await autorizarTecnico(tecnicoId);
  if (!Object.values(ModalidadeAgendamento).includes(modalidade)) throw new Error("Modalidade inválida.");
  const slots = await consultarSlotsTecnico(prisma, tecnicoId, dataCivil(data), modalidade);
  return slots.map((slot) => ({ inicio: slot.inicio.toISOString(), fim: slot.fim.toISOString() }));
}

export async function cadastrarRegraAgenda(dados: Parameters<typeof criarRegraAgenda>[0]) {
  const usuario = await autorizarTecnico(dados.tecnicoId);
  verificarPermissoes(usuario, ["ADM", "DEV", "PONTO_FOCAL", "COORDENADOR"]);
  if (!Object.values(ModalidadeAgendamento).includes(dados.modalidade)) throw new Error("Modalidade inválida.");
  return criarRegraAgenda(dados);
}

export async function cadastrarAusenciaTecnico(dados: Parameters<typeof criarAusenciaTecnico>[0]) {
  const usuario = await autorizarTecnico(dados.tecnicoId);
  verificarPermissoes(usuario, ["ADM", "DEV", "PONTO_FOCAL", "COORDENADOR"]);
  return criarAusenciaTecnico({ ...dados, atorId: usuario.id });
}

export async function listarConflitosAusencia(tecnicoId: string) {
  await autorizarTecnico(tecnicoId);
  const ausencias = await prisma.ausenciaTecnico.findMany({
    where: { tecnicoId, ativo: true },
    orderBy: { dataHoraInicio: "desc" }, take: 100,
  });
  if (!ausencias.length) return [];
  const inicio = new Date(Math.min(...ausencias.map((a) => a.dataHoraInicio.getTime())));
  const fim = new Date(Math.max(...ausencias.map((a) => a.dataHoraFim.getTime())));
  const agendamentos = await prisma.agendamento.findMany({
    where: { tecnicoId, status: "AGENDADO", dataHora: { lt: fim },
      OR: [{ dataFim: { gt: inicio } }, { dataFim: null }],
    }, select: { id: true, dataHora: true, dataFim: true, processo: true, municipe: true },
    orderBy: { dataHora: "asc" },
  });
  return agendamentos.flatMap((ag) => ausencias.filter((ausencia) =>
    ausencia.dataHoraInicio < (ag.dataFim ?? new Date(ag.dataHora.getTime() + 60 * 60_000)) &&
    ag.dataHora < ausencia.dataHoraFim,
  ).map((ausencia) => ({
    agendamentoId: ag.id, dataHora: ag.dataHora, processo: ag.processo, municipe: ag.municipe,
    ausenciaId: ausencia.id, tipoAusencia: ausencia.tipo,
  })));
}
