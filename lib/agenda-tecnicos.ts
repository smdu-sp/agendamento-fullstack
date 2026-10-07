import "server-only";

import { ModalidadeAgendamento, Prisma, StatusAgendamento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gerarSlotsAgenda, intervalosSobrepostos, validarRegraAgenda, type IntervaloOcupado } from "@/lib/agenda-slots";

type BancoAgenda = typeof prisma | Prisma.TransactionClient;
const STATUS_LIVRES = [StatusAgendamento.CANCELADO, StatusAgendamento.NAO_REALIZADO];

export function dataCivil(valor: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new Error("Data inválida.");
  const data = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) throw new Error("Data inválida.");
  return data;
}

export function dataHoraCivil(valor: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(valor)) throw new Error("Data e hora inválidas.");
  const data = new Date(`${valor}:00.000Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 16) !== valor) throw new Error("Data e hora inválidas.");
  return data;
}

function agoraCivil(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const obter = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";
  return new Date(`${obter("year")}-${obter("month")}-${obter("day")}T${obter("hour")}:${obter("minute")}:${obter("second")}.000Z`);
}

export async function bloquearTecnicos(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  for (const id of [...new Set(ids)].sort()) {
    const linhas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM usuarios WHERE id = ${id} FOR UPDATE`;
    if (!linhas.length) throw new Error("Técnico não encontrado.");
  }
}

export async function consultarSlotsTecnico(
  banco: BancoAgenda, tecnicoId: string, dia: Date, modalidade: ModalidadeAgendamento,
  ignorarAgendamentoId?: string,
  ignorarAusencias = false,
) {
  const inicioDia = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate()));
  const fimDia = new Date(inicioDia.getTime() + 86_400_000);
  const [regras, ausencias, agendamentos] = await Promise.all([
    banco.agendaTecnico.findMany({ where: {
      tecnicoId, ativo: true, diaSemana: inicioDia.getUTCDay(), modalidade,
      vigenciaInicio: { lte: inicioDia }, OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicioDia } }],
    } }),
    banco.ausenciaTecnico.findMany({ where: {
      tecnicoId, ativo: true, dataHoraInicio: { lt: fimDia }, dataHoraFim: { gt: inicioDia },
    } }),
    banco.agendamento.findMany({ where: {
      tecnicoId, status: { notIn: STATUS_LIVRES }, dataHora: { lt: fimDia },
      ...(ignorarAgendamentoId ? { id: { not: ignorarAgendamentoId } } : {}),
      OR: [{ dataFim: { gt: inicioDia } }, { dataFim: null }],
    }, select: { dataHora: true, dataFim: true } }),
  ]);
  const ocupados: IntervaloOcupado[] = agendamentos.map((a) => ({
    inicio: a.dataHora, fim: a.dataFim ?? new Date(a.dataHora.getTime() + 60 * 60_000),
  }));
  return gerarSlotsAgenda({
    data: inicioDia, modalidade, regras, ausencias: ignorarAusencias ? [] : ausencias.map((a) => ({ inicio: a.dataHoraInicio, fim: a.dataHoraFim })),
    agendamentos: ocupados, agoraCivil: agoraCivil(),
  });
}

export async function exigirSlotLivre(
  tx: Prisma.TransactionClient, tecnicoId: string, inicio: Date, fim: Date,
  modalidade: ModalidadeAgendamento, ignorarAgendamentoId?: string, permitirAusencia = false,
): Promise<void> {
  if (!(fim > inicio) || fim.toISOString().slice(0, 10) !== inicio.toISOString().slice(0, 10)) {
    throw new Error("Intervalo de atendimento inválido.");
  }
  const slots = await consultarSlotsTecnico(tx, tecnicoId, inicio, modalidade, ignorarAgendamentoId, permitirAusencia);
  if (!slots.some((slot) => slot.inicio.getTime() === inicio.getTime() && slot.fim.getTime() === fim.getTime())) {
    throw new Error("Este horário não está disponível na agenda do técnico.");
  }
}

export async function tecnicoAusenteNoIntervalo(banco: BancoAgenda, tecnicoId: string, inicio: Date, fim: Date) {
  return banco.ausenciaTecnico.findFirst({ where: {
    tecnicoId, ativo: true, dataHoraInicio: { lt: fim }, dataHoraFim: { gt: inicio },
  }, select: { id: true, tipo: true } });
}

export async function criarRegraAgenda(dados: {
  tecnicoId: string; diaSemana: number; horaInicio: string; horaFim: string; duracaoMinutos: number;
  modalidade: ModalidadeAgendamento; vigenciaInicio: string; vigenciaFim?: string | null;
}) {
  const regra = { ...dados, vigenciaInicio: dataCivil(dados.vigenciaInicio), vigenciaFim: dados.vigenciaFim ? dataCivil(dados.vigenciaFim) : null };
  validarRegraAgenda(regra);
  return prisma.$transaction(async (tx) => {
    await bloquearTecnicos(tx, [dados.tecnicoId]);
    const existentes = await tx.agendaTecnico.findMany({ where: {
      tecnicoId: dados.tecnicoId, diaSemana: dados.diaSemana, modalidade: dados.modalidade, ativo: true,
      vigenciaInicio: { lte: regra.vigenciaFim ?? new Date('9999-12-31T00:00:00.000Z') },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: regra.vigenciaInicio } }],
    }, select: { horaInicio: true, horaFim: true } });
    if (existentes.some((item) => item.horaInicio < regra.horaFim && regra.horaInicio < item.horaFim)) {
      throw new Error('Esta faixa se sobrepõe a outra regra ativa do técnico.');
    }
    return tx.agendaTecnico.create({ data: regra });
  });
}

export async function criarAusenciaTecnico(dados: {
  tecnicoId: string; tipo: string; inicio: string; fim: string; observacao?: string; atorId?: string;
}) {
  const inicio = dataHoraCivil(dados.inicio);
  const fim = dataHoraCivil(dados.fim);
  if (fim <= inicio) throw new Error("O fim da ausência deve ser posterior ao início.");
  const tipo = dados.tipo.trim();
  if (!tipo || tipo.length > 80) throw new Error("Tipo de ausência inválido.");
  return prisma.$transaction(async (tx) => {
    await bloquearTecnicos(tx, [dados.tecnicoId]);
    const afetados = await tx.agendamento.findMany({ where: {
      tecnicoId: dados.tecnicoId, status: StatusAgendamento.AGENDADO, dataHora: { lt: fim },
      OR: [{ dataFim: { gt: inicio } }, { dataFim: null }],
    }, select: { id: true, dataHora: true, dataFim: true, status: true } });
    const ausencia = await tx.ausenciaTecnico.create({ data: {
      tecnicoId: dados.tecnicoId, tipo, dataHoraInicio: inicio, dataHoraFim: fim,
      observacao: dados.observacao?.trim() || null,
    } });
    const agendamentosAfetados = afetados.filter((a) => intervalosSobrepostos(
      { inicio: a.dataHora, fim: a.dataFim ?? new Date(a.dataHora.getTime() + 60 * 60_000) }, { inicio, fim },
    )).map((a) => ({ id: a.id, status: a.status, dataHora: a.dataHora }));
    for (const ag of agendamentosAfetados) {
      await tx.eventoAgendamento.create({ data: {
        agendamentoId: ag.id, atorId: dados.atorId, tipo: 'CONFLITO_AUSENCIA',
        dados: { ausenciaId: ausencia.id, tecnicoId: dados.tecnicoId, periodoInicio: inicio.toISOString(), periodoFim: fim.toISOString() },
      } });
    }
    return { ausencia, agendamentosAfetados };
  });
}
