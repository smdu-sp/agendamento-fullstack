import 'server-only';

import {
  AutorMensagemPreProjetoArthurSaboya,
  Permissao,
  StatusAgendamento,
  StatusSolicitacaoPreProjeto,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validarTransicaoAgendamento } from '@/lib/agendamento-transicoes';
import { CHAVE_EMAIL_MARCADOR_REUNIOES } from '@/types/configuracao';
import {
  INCLUDE_AGENDAMENTO,
  PRE_PROJETO_DURACAO_ATENDIMENTO_MINUTOS,
  calcularDataFim,
  formatarDataHoraSaoPaulo,
} from '@/lib/agendamentos-core';
import { reuniaoJaTerminou } from '@/lib/date-time';
import {
  corpoHtmlCondicoesAtendimentoTecnicoOutlook,
} from '@/lib/outlook-agendamento-teams';
import {
  EMAIL_MARCADOR_REUNIOES_PADRAO,
  EMAIL_SABOYA_ATENDIMENTO,
  ehTipoArthurSaboya,
  montarAssuntoReuniaoPorTipo,
} from '@/lib/reuniao-teams-titulos';
import {
  GraphError,
  graphBuscarPresencas,
  graphBuscarUsuario,
  graphCancelarEvento,
  graphAtualizarEventoTeams,
  graphConfigurado,
  graphCriarEventoTeams,
  graphEnviarEmail,
  graphResolverMeetingId,
  type GraphAttendee,
} from '@/lib/teams-graph';
import type { IAgendamento } from '@/types/agendamento';

const GRACE_PRESENCA_MS = 45 * 60 * 1000;

export type ResultadoTeams = { ok: boolean; error?: string };

export type ResultadoPresenca = {
  ok: boolean;
  error?: string;
  statusAlterado: boolean;
  aguardandoRelatorio: boolean;
  temPresenca: boolean;
  agendamento?: IAgendamento;
};

export async function obterEmailMarcadorReunioes(): Promise<string | null> {
  const row = await prisma.configuracaoSistema.findUnique({
    where: { chave: CHAVE_EMAIL_MARCADOR_REUNIOES },
    select: { valor: true },
  });
  const email = row?.valor?.trim() || EMAIL_MARCADOR_REUNIOES_PADRAO;
  return email || null;
}

function emailValido(valor: string | null | undefined): string | null {
  const t = (valor || '').trim();
  if (!t || !t.includes('@')) return null;
  return t;
}

type FalhaReuniaoParaAviso = {
  agendamentoId: string;
  coordenadoriaId: string | null;
  ehArthur: boolean;
  processo: string | null;
  protocolo: string | null;
  municipe: string | null;
  dataHoraLabel: string;
  error: string;
};

function urlPublicaApp(path: string): string {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function emailsPontosFocaisDaCoordenadoria(
  coordenadoriaId: string | null,
): Promise<GraphAttendee[]> {
  if (!coordenadoriaId) return [];
  const usuarios = await prisma.usuario.findMany({
    where: {
      status: true,
      permissao: { in: [Permissao.PONTO_FOCAL, Permissao.COORDENADOR] },
      divisao: { coordenadoriaId },
    },
    select: { email: true, nome: true },
  });
  const lista: GraphAttendee[] = [];
  for (const u of usuarios) {
    const email = emailValido(u.email);
    if (email) lista.push({ email, nome: u.nome });
  }
  if (lista.length) return lista;

  const coord = await prisma.coordenadoria.findUnique({
    where: { id: coordenadoriaId },
    select: { email: true, sigla: true },
  });
  const emailCoord = emailValido(coord?.email);
  if (emailCoord) {
    return [{ email: emailCoord, nome: coord?.sigla || 'Coordenadoria' }];
  }
  return [];
}

function htmlAvisoFalhaReunioes(falhas: FalhaReuniaoParaAviso[]): string {
  const itens = falhas
    .map((f) => {
      const ref = f.ehArthur
        ? `Protocolo ${f.protocolo || f.processo || '—'}`
        : `Processo ${f.processo || '—'}`;
      const href = f.ehArthur && (f.protocolo || f.processo)
        ? urlPublicaApp(
            `/pedidos-pre-projetos-arthur-saboya/${encodeURIComponent(
              (f.protocolo || f.processo || '').trim(),
            )}`,
          )
        : urlPublicaApp(`/agendamentos/${f.agendamentoId}`);
      return (
        `<li>` +
        `<strong>${ref}</strong>` +
        (f.municipe ? ` — ${f.municipe}` : '') +
        ` (${f.dataHoraLabel})<br/>` +
        `<span>Motivo: ${f.error}</span><br/>` +
        `<a href="${href}">Abrir no sistema</a>` +
        `</li>`
      );
    })
    .join('');
  return (
    `<p>Não foi possível criar automaticamente a reunião no Microsoft Teams.` +
    ` Use o agendamento manual (botão no sistema ou Outlook) como alternativa.</p>` +
    `<ul>${itens}</ul>`
  );
}

async function notificarPontosFocaisFalhasReuniao(
  falhas: FalhaReuniaoParaAviso[],
): Promise<void> {
  if (!falhas.length || !graphConfigurado()) return;
  const organizer = await obterEmailMarcadorReunioes();
  if (!organizer) return;

  const porCoord = new Map<string, FalhaReuniaoParaAviso[]>();
  for (const f of falhas) {
    const chave = f.coordenadoriaId || '__sem_coord__';
    const lista = porCoord.get(chave) ?? [];
    lista.push(f);
    porCoord.set(chave, lista);
  }

  for (const [coordId, lista] of porCoord) {
    const destinos = await emailsPontosFocaisDaCoordenadoria(
      coordId === '__sem_coord__' ? null : coordId,
    );
    if (!destinos.length) continue;
    const n = lista.length;
    const assunto =
      n === 1
        ? `Falha ao agendar reunião Teams — ${
            lista[0].ehArthur
              ? lista[0].protocolo || lista[0].processo || 'Arthur Saboya'
              : lista[0].processo || 'agendamento técnico'
          }`
        : `Falha ao agendar ${n} reuniões Teams`;
    try {
      await graphEnviarEmail({
        fromEmail: organizer,
        para: destinos,
        assunto,
        corpoHtml: htmlAvisoFalhaReunioes(lista),
      });
    } catch (e) {
      console.error(
        '[Teams] aviso ponto focal:',
        e instanceof Error ? e.message : e,
      );
    }
  }
}

function deveAvisarFalhaAgendamento(error?: string): boolean {
  if (!error) return false;
  if (error.includes('Atribua um técnico')) return false;
  if (error.includes('não encontrado')) return false;
  if (error.includes('não pode mais receber reunião')) return false;
  return true;
}

async function marcarSolicitacaoArthurAgendada(
  agendamentoId: string,
  processo: string | null,
  dataHora: Date,
): Promise<void> {
  const proc = (processo ?? '').trim().toUpperCase();
  const sol = await prisma.solicitacaoPreProjetoArthurSaboya.findFirst({
    where: {
      OR: [
        { agendamentoId },
        ...(proc.startsWith('PP-') || proc.startsWith('AS-')
          ? [{ protocolo: proc }]
          : []),
      ],
    },
    select: { id: true },
  });
  if (!sol) return;
  await prisma.solicitacaoPreProjetoArthurSaboya.update({
    where: { id: sol.id },
    data: { status: StatusSolicitacaoPreProjeto.AGENDAMENTO_CRIADO },
  });
  await prisma.solicitacaoPreProjetoArthurSaboyaMensagem.create({
    data: {
      solicitacaoId: sol.id,
      autor: AutorMensagemPreProjetoArthurSaboya.SISTEMA,
      corpo: `O atendimento técnico foi agendado para o dia ${formatarDataHoraSaoPaulo(
        dataHora,
      )}. O atendimento será realizado de forma online, por meio do link enviado para o seu e-mail. Caso não possa comparecer, solicitamos que cancele o agendamento pelo botão Cancelar Atendimento.`,
    },
  });
}

async function registrarErroTeams(agendamentoId: string, mensagem: string) {
  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: { teamsUltimoErro: mensagem.slice(0, 4000) },
  });
}

/**
 * Cria a reunião Teams via Graph quando há técnico, e-mails e caixa marcadora.
 * Não lança: grava o erro em `teamsUltimoErro`.
 */
export async function criarReuniaoTeamsSePossivel(
  agendamentoId: string,
  opts?: { notificarFalha?: boolean },
): Promise<ResultadoTeams> {
  const notificarFalha = opts?.notificarFalha !== false;
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: INCLUDE_AGENDAMENTO,
  });
  if (!ag) return { ok: false, error: 'Agendamento não encontrado.' };
  if (ag.modalidade === 'PRESENCIAL') {
    return { ok: false, error: 'Atendimento presencial não utiliza reunião Teams.' };
  }

  const tipoArthur = ehTipoArthurSaboya(ag.tipoAgendamento?.texto);
  let solicitacao = await prisma.solicitacaoPreProjetoArthurSaboya.findUnique({
    where: { agendamentoId },
    select: {
      protocolo: true,
      tecnicoArthur: { select: { email: true, nome: true } },
    },
  });
  if (!solicitacao && tipoArthur && ag.processo) {
    solicitacao = await prisma.solicitacaoPreProjetoArthurSaboya.findFirst({
      where: { protocolo: ag.processo },
      select: {
        protocolo: true,
        tecnicoArthur: { select: { email: true, nome: true } },
      },
    });
  }
  const ehArthur = tipoArthur || !!solicitacao;
  const dataHoraLabel = formatarDataHoraSaoPaulo(ag.dataHora);

  const falhaParaAviso = (error: string): FalhaReuniaoParaAviso => ({
    agendamentoId,
    coordenadoriaId: ag.coordenadoriaId,
    ehArthur,
    processo: ag.processo,
    protocolo: null,
    municipe: ag.municipe,
    dataHoraLabel,
    error,
  });

  const registrarEAvisar = async (msg: string, extra?: { protocolo?: string | null }) => {
    await registrarErroTeams(agendamentoId, msg);
    await prisma.agendamento.updateMany({ where: { id: agendamentoId, status: { in: [StatusAgendamento.SOLICITADO, StatusAgendamento.AGENDADO] } }, data: {
      teamsSyncPendente: true, teamsSyncVersao: { increment: 1 },
    } });
    if (notificarFalha && deveAvisarFalhaAgendamento(msg)) {
      await notificarPontosFocaisFalhasReuniao([
        { ...falhaParaAviso(msg), protocolo: extra?.protocolo ?? null },
      ]);
    }
    return { ok: false, error: msg };
  };

  if (ag.teamsEventId) {
    return { ok: true };
  }
  if (
    ag.status === StatusAgendamento.CANCELADO ||
    ag.status === StatusAgendamento.CONCLUIDO ||
    ag.status === StatusAgendamento.ATENDIDO ||
    ag.status === StatusAgendamento.NAO_REALIZADO
  ) {
    return { ok: false, error: 'Este agendamento não pode mais receber reunião.' };
  }
  if (!ag.tecnicoId || !ag.tecnico) {
    return { ok: false, error: 'Atribua um técnico antes de agendar a reunião.' };
  }

  if (!graphConfigurado()) {
    const msg =
      'Credenciais do Microsoft Graph não configuradas no ambiente (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).';
    return registrarEAvisar(msg);
  }

  const organizer = await obterEmailMarcadorReunioes();
  if (!organizer) {
    const msg =
      'Configure o e-mail do usuário marcador de reuniões em Configurações.';
    return registrarEAvisar(msg);
  }

  const emailTecnico = emailValido(ag.tecnico.email);
  const emailMunicipe = emailValido(ag.email);
  const emailCoordenadoria = emailValido(ag.coordenadoria?.email);
  const emailTecnicoArthur = emailValido(solicitacao?.tecnicoArthur?.email);
  const faltando: string[] = [];
  if (!emailTecnico) faltando.push('e-mail do técnico');
  if (!emailMunicipe) faltando.push('e-mail do munícipe');
  if (!emailCoordenadoria) faltando.push('e-mail da coordenadoria');
  if (ehArthur && !emailTecnicoArthur) {
    faltando.push('e-mail do técnico da Sala Arthur Saboya');
  }
  if (faltando.length) {
    const msg = `Não foi possível criar a reunião: falta ${faltando.join(', ')}.`;
    return registrarEAvisar(msg, { protocolo: solicitacao?.protocolo ?? null });
  }

  const inicio = ag.dataHora;
  const duracaoMin = ehArthur ? PRE_PROJETO_DURACAO_ATENDIMENTO_MINUTOS : 60;
  const fim = ag.dataFim ?? calcularDataFim(ag.dataHora, duracaoMin);

  const participantes: GraphAttendee[] = [
    { email: emailTecnico!, nome: ag.tecnico.nome },
    { email: emailMunicipe!, nome: ag.municipe || undefined },
    {
      email: emailCoordenadoria!,
      nome: ag.coordenadoria?.sigla || 'Coordenadoria',
    },
  ];
  if (ehArthur) {
    if (emailTecnicoArthur) {
      participantes.push({
        email: emailTecnicoArthur,
        nome: solicitacao?.tecnicoArthur?.nome || 'Técnico Arthur Saboya',
      });
    }
    participantes.push({
      email: EMAIL_SABOYA_ATENDIMENTO,
      nome: 'Sala Arthur Saboya',
    });
  }

  const assunto = montarAssuntoReuniaoPorTipo({
    tipoAgendamentoTexto: ag.tipoAgendamento?.texto,
    siglaCoordenadoria: ag.coordenadoria?.sigla,
    processo: ag.processo,
    protocolo: solicitacao?.protocolo,
  });

  try {
    const evento = await graphCriarEventoTeams({
      transactionId: agendamentoId,
      organizerEmail: organizer,
      assunto,
      corpoHtml: corpoHtmlCondicoesAtendimentoTecnicoOutlook(dataHoraLabel),
      inicio,
      fim,
      participantes,
    });

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM agendamentos WHERE id = ${agendamentoId} FOR UPDATE`;
      const atual = await tx.agendamento.findUniqueOrThrow({ where: { id: agendamentoId }, select: {
        status: true, teamsEventId: true, teamsSyncVersao: true,
      } });
      if (atual.teamsEventId) return;
      const podeAgendar = atual.status === StatusAgendamento.SOLICITADO || atual.status === StatusAgendamento.AGENDADO;
      const alterado = await tx.agendamento.update({
      where: { id: agendamentoId },
      data: {
        teamsEventId: evento.eventId,
        teamsJoinUrl: evento.joinUrl,
        teamsMeetingId: evento.meetingId,
        teamsOrganizerEmail: organizer,
        teamsUltimoErro: null,
        ...(podeAgendar ? { status: StatusAgendamento.AGENDADO,
          teamsSyncPendente: atual.teamsSyncVersao === ag.teamsSyncVersao ? false : true,
        } : { teamsSyncPendente: true }),
      },
      });
      void alterado;
      if (atual.status === StatusAgendamento.SOLICITADO) {
        await tx.eventoAgendamento.create({ data: {
          agendamentoId, tipo: 'STATUS_ALTERADO', dados: { anterior: atual.status, novo: StatusAgendamento.AGENDADO, origem: 'TEAMS' },
        } });
      }
    });
    if (ehArthur) {
      await marcarSolicitacaoArthurAgendada(agendamentoId, ag.processo, ag.dataHora);
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof GraphError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Falha ao criar reunião no Microsoft Teams.';
    console.error('[Teams] criar reunião:', msg);
    return registrarEAvisar(msg, { protocolo: solicitacao?.protocolo ?? null });
  }
}

export async function agendarReunioesEmLote(
  ids: string[],
): Promise<{ agendadas: number; falhas: number }> {
  let agendadas = 0;
  let falhas = 0;
  const avisos: FalhaReuniaoParaAviso[] = [];
  for (const id of ids) {
    const r = await criarReuniaoTeamsSePossivel(id, { notificarFalha: false });
    if (r.ok) {
      agendadas++;
      continue;
    }
    falhas++;
    if (!deveAvisarFalhaAgendamento(r.error)) continue;
    const ag = await prisma.agendamento.findUnique({
      where: { id },
      select: {
        coordenadoriaId: true,
        processo: true,
        municipe: true,
        dataHora: true,
        tipoAgendamento: { select: { texto: true } },
        solicitacaoPreProjetoArthurSaboya: { select: { protocolo: true } },
      },
    });
    if (!ag) continue;
    avisos.push({
      agendamentoId: id,
      coordenadoriaId: ag.coordenadoriaId,
      ehArthur: ehTipoArthurSaboya(ag.tipoAgendamento?.texto),
      processo: ag.processo,
      protocolo: ag.solicitacaoPreProjetoArthurSaboya?.protocolo ?? null,
      municipe: ag.municipe,
      dataHoraLabel: formatarDataHoraSaoPaulo(ag.dataHora),
      error: r.error || 'Falha ao criar reunião no Microsoft Teams.',
    });
  }
  await notificarPontosFocaisFalhasReuniao(avisos);
  return { agendadas, falhas };
}

/** Reprocessa a intenção persistida sem manter transação aberta durante o Graph. */
export async function sincronizarReuniaoTeamsPendente(agendamentoId: string): Promise<ResultadoTeams> {
  const agora = new Date();
  const claim = await prisma.agendamento.updateMany({ where: {
    id: agendamentoId, teamsSyncPendente: true,
    OR: [{ teamsSyncEmProcessamentoAte: null }, { teamsSyncEmProcessamentoAte: { lt: agora } }],
  }, data: {
    teamsSyncEmProcessamentoAte: new Date(agora.getTime() + 5 * 60_000),
    teamsSyncTentativas: { increment: 1 },
  } });
  if (!claim.count) return { ok: false, error: 'Sincronização já processada ou em andamento.' };

  const ag = await prisma.agendamento.findUniqueOrThrow({ where: { id: agendamentoId }, include: INCLUDE_AGENDAMENTO });
  const versao = ag.teamsSyncVersao;
  try {
    if (ag.status === StatusAgendamento.CANCELADO) {
      if (ag.teamsEventId) {
        const organizer = ag.teamsOrganizerEmail || await obterEmailMarcadorReunioes();
        if (!organizer) throw new Error('Organizador Teams não configurado.');
        await graphCancelarEvento(organizer, ag.teamsEventId, ag.motivoCancelamento || 'Atendimento cancelado.');
      }
    } else if (ag.modalidade === 'PRESENCIAL') {
      if (ag.teamsEventId) throw new Error('Atendimento presencial possui reunião Teams; corrija a divergência.');
    } else if (!ag.teamsEventId) {
      const resultado = await criarReuniaoTeamsSePossivel(agendamentoId, { notificarFalha: false });
      if (!resultado.ok) throw new Error(resultado.error || 'Falha ao criar reunião Teams.');
    } else {
      const organizer = ag.teamsOrganizerEmail || await obterEmailMarcadorReunioes();
      if (!organizer) throw new Error('Organizador Teams não configurado.');
      const participantes: GraphAttendee[] = [];
      if (ag.tecnico?.email) participantes.push({ email: ag.tecnico.email, nome: ag.tecnico.nome });
      if (ag.email) participantes.push({ email: ag.email, nome: ag.municipe || undefined });
      if (ag.coordenadoria?.email) participantes.push({ email: ag.coordenadoria.email, nome: ag.coordenadoria.sigla });
      if (ehTipoArthurSaboya(ag.tipoAgendamento?.texto)) {
        const solicitacao = await prisma.solicitacaoPreProjetoArthurSaboya.findUnique({
          where: { agendamentoId }, select: { tecnicoArthur: { select: { email: true, nome: true } } },
        });
        if (solicitacao?.tecnicoArthur?.email) participantes.push({ email: solicitacao.tecnicoArthur.email, nome: solicitacao.tecnicoArthur.nome });
        participantes.push({ email: EMAIL_SABOYA_ATENDIMENTO, nome: 'Sala Arthur Saboya' });
      }
      await graphAtualizarEventoTeams({
        organizerEmail: organizer, eventId: ag.teamsEventId,
        inicio: ag.dataHora, fim: ag.dataFim ?? calcularDataFim(ag.dataHora, 60), participantes,
      });
    }
    await prisma.agendamento.updateMany({ where: { id: agendamentoId, teamsSyncVersao: versao }, data: {
      teamsSyncPendente: false, teamsUltimoErro: null, teamsSyncEmProcessamentoAte: null, teamsSyncTentativas: 0,
    } });
    await prisma.agendamento.updateMany({ where: { id: agendamentoId, teamsSyncVersao: { not: versao } }, data: {
      teamsSyncEmProcessamentoAte: null,
    } });
    return { ok: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Falha ao sincronizar reunião Teams.';
    await prisma.agendamento.update({ where: { id: agendamentoId }, data: {
      teamsUltimoErro: mensagem, teamsSyncEmProcessamentoAte: null,
    } });
    return { ok: false, error: mensagem };
  }
}

export async function sincronizarReunioesTeamsPendentes(limite = 20): Promise<{ processadas: number; falhas: number }> {
  const agora = new Date();
  const pendentes = await prisma.agendamento.findMany({ where: {
    teamsSyncPendente: true, teamsSyncTentativas: { lt: 5 },
    OR: [{ teamsSyncEmProcessamentoAte: null }, { teamsSyncEmProcessamentoAte: { lt: agora } }],
  }, select: { id: true }, orderBy: { atualizadoEm: 'asc' }, take: Math.max(1, Math.min(100, limite)) });
  let falhas = 0;
  for (const pendente of pendentes) {
    const resultado = await sincronizarReuniaoTeamsPendente(pendente.id);
    if (!resultado.ok) falhas++;
  }
  return { processadas: pendentes.length, falhas };
}

export async function cancelarReuniaoTeamsInterno(
  agendamentoId: string,
  motivo: string,
  usuarioId?: string | null,
): Promise<ResultadoTeams> {
  const motivoTrim = motivo.trim();
  if (motivoTrim.length < 5) {
    return { ok: false, error: 'Informe o motivo do cancelamento (mínimo 5 caracteres).' };
  }

  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    select: {
      status: true,
      teamsEventId: true,
      teamsOrganizerEmail: true,
    },
  });
  if (!ag) return { ok: false, error: 'Agendamento não encontrado.' };
  if (ag.status === StatusAgendamento.CANCELADO) {
    return { ok: false, error: 'Esta reunião já está cancelada.' };
  }

  try { validarTransicaoAgendamento(ag.status, StatusAgendamento.CANCELADO); }
  catch { return { ok: false, error: 'Este atendimento não pode mais ser cancelado.' }; }

  await prisma.$transaction(async (tx) => {
    const alterado = await tx.agendamento.updateMany({
    where: { id: agendamentoId, status: ag.status },
    data: {
      status: StatusAgendamento.CANCELADO,
      motivoCancelamento: motivoTrim,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId || null,
      teamsUltimoErro: null,
      teamsSyncPendente: !!ag.teamsEventId,
      teamsSyncVersao: { increment: 1 },
      teamsSyncTentativas: 0,
    },
    });
    if (!alterado.count) throw new Error('O agendamento foi alterado por outra pessoa.');
    await tx.eventoAgendamento.create({ data: {
      agendamentoId, atorId: usuarioId || null, tipo: 'CANCELADO',
      dados: { statusAnterior: ag.status, motivo: motivoTrim, origem: 'TEAMS' },
    } });
  });
  if (!ag.teamsEventId) return { ok: true };
  await sincronizarReuniaoTeamsPendente(agendamentoId);
  return { ok: true };
}

function teveParticipacao(presencas: { durationSeconds: number | null }[]): boolean {
  return presencas.some((p) => (p.durationSeconds ?? 0) > 0);
}

export async function sincronizarPresencaInterno(
  agendamentoId: string,
  opts?: { force?: boolean },
): Promise<ResultadoPresenca> {
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: INCLUDE_AGENDAMENTO,
  });
  if (!ag) return { ok: false, error: 'Agendamento não encontrado.', statusAlterado: false, aguardandoRelatorio: false, temPresenca: false };

  if (!ag.teamsEventId && !ag.teamsJoinUrl) {
    return {
      ok: false,
      error: 'Este agendamento não possui reunião Teams.',
      statusAlterado: false,
      aguardandoRelatorio: false,
      temPresenca: false,
    };
  }

  if (
    ag.status === StatusAgendamento.CANCELADO ||
    ag.status === StatusAgendamento.CONCLUIDO ||
    ag.status === StatusAgendamento.ATENDIDO ||
    ag.status === StatusAgendamento.NAO_REALIZADO
  ) {
    return {
      ok: true,
      statusAlterado: false,
      aguardandoRelatorio: false,
      temPresenca: (ag.presencasReuniao?.length ?? 0) > 0,
      agendamento: ag as unknown as IAgendamento,
    };
  }

  if (ag.status !== StatusAgendamento.AGENDADO) {
    return { ok: false, error: 'Somente atendimentos agendados podem ter o resultado sincronizado.', statusAlterado: false, aguardandoRelatorio: false, temPresenca: false };
  }

  if (!reuniaoJaTerminou(ag.dataFim, ag.dataHora)) {
    return {
      ok: true,
      statusAlterado: false,
      aguardandoRelatorio: true,
      temPresenca: false,
      agendamento: ag as unknown as IAgendamento,
    };
  }

  if (
    !opts?.force &&
    ag.presencaSincronizadaEm &&
    Date.now() - ag.presencaSincronizadaEm.getTime() < 10 * 60 * 1000
  ) {
    return {
      ok: true,
      statusAlterado: false,
      aguardandoRelatorio: ag.status === StatusAgendamento.AGENDADO,
      temPresenca: (ag.presencasReuniao?.length ?? 0) > 0,
      agendamento: ag as unknown as IAgendamento,
    };
  }

  const organizer =
    ag.teamsOrganizerEmail || (await obterEmailMarcadorReunioes());
  if (!organizer || !graphConfigurado()) {
    return {
      ok: false,
      error: 'Graph ou e-mail do marcador não configurados.',
      statusAlterado: false,
      aguardandoRelatorio: false,
      temPresenca: false,
    };
  }

  let meetingId = ag.teamsMeetingId;
  if (!meetingId && ag.teamsJoinUrl) {
    meetingId = await graphResolverMeetingId(organizer, ag.teamsJoinUrl);
    if (meetingId) {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { teamsMeetingId: meetingId },
      });
    }
  }

  if (!meetingId) {
    return finalizarSemRelatorio(agendamentoId, ag.dataFim, ag.dataHora);
  }

  try {
    const { relatorioEncontrado, presencas } = await graphBuscarPresencas(
      organizer,
      meetingId,
    );

    if (!relatorioEncontrado) {
      return finalizarSemRelatorio(agendamentoId, ag.dataFim, ag.dataHora);
    }

    await prisma.$transaction(async (tx) => {
      await tx.presencaReuniao.deleteMany({ where: { agendamentoId } });
      if (presencas.length) {
        await tx.presencaReuniao.createMany({
          data: presencas.map((p) => ({
            agendamentoId,
            displayName: p.displayName,
            email: p.email,
            role: p.role,
            durationSeconds: p.durationSeconds,
            joinDateTime: p.joinDateTime,
            leaveDateTime: p.leaveDateTime,
          })),
        });
      }
    });

    const realizado = teveParticipacao(presencas);
    const novoStatus = realizado
      ? StatusAgendamento.ATENDIDO
      : StatusAgendamento.NAO_REALIZADO;
    // Já saímos cedo se o status era ATENDIDO/NAO_REALIZADO/CANCELADO.
    const statusAlterado = true;

    const atualizado = await prisma.$transaction(async (tx) => {
      const alterado = await tx.agendamento.updateMany({
      where: { id: agendamentoId, status: StatusAgendamento.AGENDADO },
      data: {
        status: novoStatus,
        presencaSincronizadaEm: new Date(),
        teamsUltimoErro: null,
        ...(novoStatus === StatusAgendamento.ATENDIDO
          ? { motivoNaoAtendimentoId: null }
          : {}),
      },
      });
      if (!alterado.count) throw new Error('Status alterado durante a sincronização de presença.');
      await tx.eventoAgendamento.create({ data: {
        agendamentoId, tipo: 'STATUS_ALTERADO', dados: { anterior: StatusAgendamento.AGENDADO, novo: novoStatus, origem: 'TEAMS' },
      } });
      return tx.agendamento.findUniqueOrThrow({ where: { id: agendamentoId }, include: INCLUDE_AGENDAMENTO });
    });

    return {
      ok: true,
      statusAlterado,
      aguardandoRelatorio: false,
      temPresenca: realizado,
      agendamento: atualizado as unknown as IAgendamento,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao ler presença no Teams.';
    console.error('[Teams] presença:', msg);
    await registrarErroTeams(agendamentoId, msg);
    return {
      ok: false,
      error: msg,
      statusAlterado: false,
      aguardandoRelatorio: false,
      temPresenca: false,
    };
  }
}

async function finalizarSemRelatorio(
  agendamentoId: string,
  dataFim: Date | null,
  dataHora: Date,
): Promise<ResultadoPresenca> {
  const fim = dataFim ?? calcularDataFim(dataHora, 60);
  const fimReal = new Date(
    Date.UTC(
      fim.getUTCFullYear(),
      fim.getUTCMonth(),
      fim.getUTCDate(),
      fim.getUTCHours() + 3,
      fim.getUTCMinutes(),
      fim.getUTCSeconds(),
    ),
  );
  const passouGrace = Date.now() - fimReal.getTime() >= GRACE_PRESENCA_MS;

  if (!passouGrace) {
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { presencaSincronizadaEm: new Date() },
    });
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: INCLUDE_AGENDAMENTO,
    });
    return {
      ok: true,
      statusAlterado: false,
      aguardandoRelatorio: true,
      temPresenca: false,
      agendamento: ag as unknown as IAgendamento,
    };
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const alterado = await tx.agendamento.updateMany({
    where: { id: agendamentoId, status: StatusAgendamento.AGENDADO },
    data: {
      status: StatusAgendamento.NAO_REALIZADO,
      presencaSincronizadaEm: new Date(),
    },
    });
    if (!alterado.count) throw new Error('Status alterado durante a sincronização de presença.');
    await tx.eventoAgendamento.create({ data: {
      agendamentoId, tipo: 'STATUS_ALTERADO', dados: { anterior: StatusAgendamento.AGENDADO, novo: StatusAgendamento.NAO_REALIZADO, origem: 'TEAMS' },
    } });
    return tx.agendamento.findUniqueOrThrow({ where: { id: agendamentoId }, include: INCLUDE_AGENDAMENTO });
  });
  return {
    ok: true,
    statusAlterado: atualizado.status === StatusAgendamento.NAO_REALIZADO,
    aguardandoRelatorio: false,
    temPresenca: false,
    agendamento: atualizado as unknown as IAgendamento,
  };
}

export async function testarConexaoGraphInterno(emailMarcador: string): Promise<{
  ok: boolean;
  error?: string;
  displayName?: string;
  mail?: string;
}> {
  if (!graphConfigurado()) {
    return {
      ok: false,
      error:
        'Credenciais Azure não configuradas (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).',
    };
  }
  const email = emailValido(emailMarcador);
  if (!email) return { ok: false, error: 'Informe um e-mail válido do marcador.' };
  try {
    const user = await graphBuscarUsuario(email);
    return {
      ok: true,
      displayName: user.displayName,
      mail: user.mail || user.userPrincipalName,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Falha ao consultar o Graph.',
    };
  }
}
