import 'server-only';

import { StatusAgendamento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CHAVE_EMAIL_MARCADOR_REUNIOES } from '@/types/configuracao';
import { INCLUDE_AGENDAMENTO, calcularDataFim, formatarDataHoraSaoPaulo } from '@/lib/agendamentos-core';
import { reuniaoJaTerminou } from '@/lib/date-time';
import {
  corpoHtmlCondicoesAtendimentoTecnicoOutlook,
} from '@/lib/outlook-agendamento-teams';
import {
  GraphError,
  graphBuscarPresencas,
  graphBuscarUsuario,
  graphCancelarEvento,
  graphConfigurado,
  graphCriarEventoTeams,
  graphResolverMeetingId,
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
  const email = row?.valor?.trim() || '';
  return email || null;
}

function emailValido(valor: string | null | undefined): string | null {
  const t = (valor || '').trim();
  if (!t || !t.includes('@')) return null;
  return t;
}

function montarAssunto(ag: {
  coordenadoria?: { sigla?: string | null } | null;
  processo?: string | null;
}): string {
  const sigla = ag.coordenadoria?.sigla ?? '';
  const processo = ag.processo ?? '';
  return `Agendamento Técnico - ${sigla} - Processo: ${processo}`.trim();
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
): Promise<ResultadoTeams> {
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: INCLUDE_AGENDAMENTO,
  });
  if (!ag) return { ok: false, error: 'Agendamento não encontrado.' };

  if (ag.teamsEventId) {
    return { ok: true };
  }
  if (
    ag.status === StatusAgendamento.CANCELADO ||
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
    await registrarErroTeams(agendamentoId, msg);
    return { ok: false, error: msg };
  }

  const organizer = await obterEmailMarcadorReunioes();
  if (!organizer) {
    const msg =
      'Configure o e-mail do usuário marcador de reuniões em Configurações.';
    await registrarErroTeams(agendamentoId, msg);
    return { ok: false, error: msg };
  }

  const emailTecnico = emailValido(ag.tecnico.email);
  const emailMunicipe = emailValido(ag.email);
  const emailCoordenadoria = emailValido(ag.coordenadoria?.email);
  const faltando: string[] = [];
  if (!emailTecnico) faltando.push('e-mail do técnico');
  if (!emailMunicipe) faltando.push('e-mail do munícipe');
  if (!emailCoordenadoria) faltando.push('e-mail da coordenadoria');
  if (faltando.length) {
    const msg = `Não foi possível criar a reunião: falta ${faltando.join(', ')}.`;
    await registrarErroTeams(agendamentoId, msg);
    return { ok: false, error: msg };
  }

  const inicio = ag.dataHora;
  const fim = ag.dataFim ?? calcularDataFim(ag.dataHora, 60);
  const dataHoraLabel = formatarDataHoraSaoPaulo(ag.dataHora);

  try {
    const evento = await graphCriarEventoTeams({
      organizerEmail: organizer,
      assunto: montarAssunto(ag),
      corpoHtml: corpoHtmlCondicoesAtendimentoTecnicoOutlook(dataHoraLabel),
      inicio,
      fim,
      participantes: [
        { email: emailTecnico!, nome: ag.tecnico.nome },
        { email: emailMunicipe!, nome: ag.municipe || undefined },
        {
          email: emailCoordenadoria!,
          nome: ag.coordenadoria?.sigla || 'Coordenadoria',
        },
      ],
    });

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        teamsEventId: evento.eventId,
        teamsJoinUrl: evento.joinUrl,
        teamsMeetingId: evento.meetingId,
        teamsOrganizerEmail: organizer,
        teamsUltimoErro: null,
        status: StatusAgendamento.AGENDADO,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof GraphError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Falha ao criar reunião no Microsoft Teams.';
    console.error('[Teams] criar reunião:', msg);
    await registrarErroTeams(agendamentoId, msg);
    return { ok: false, error: msg };
  }
}

export async function agendarReunioesEmLote(
  ids: string[],
): Promise<{ agendadas: number; falhas: number }> {
  let agendadas = 0;
  let falhas = 0;
  for (const id of ids) {
    const r = await criarReuniaoTeamsSePossivel(id);
    if (r.ok) agendadas++;
    else falhas++;
  }
  return { agendadas, falhas };
}

export async function cancelarReuniaoTeamsInterno(
  agendamentoId: string,
  motivo: string,
  usuarioId: string,
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

  if (ag.teamsEventId) {
    const organizer = ag.teamsOrganizerEmail || (await obterEmailMarcadorReunioes());
    if (organizer && graphConfigurado()) {
      try {
        await graphCancelarEvento(organizer, ag.teamsEventId, motivoTrim);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao cancelar no Teams.';
        console.error('[Teams] cancelar reunião:', msg);
        return { ok: false, error: `Não foi possível cancelar no Teams: ${msg}` };
      }
    }
  }

  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: {
      status: StatusAgendamento.CANCELADO,
      motivoCancelamento: motivoTrim,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId,
      teamsUltimoErro: null,
    },
  });
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
    const statusAlterado = ag.status !== novoStatus;

    const atualizado = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        status: novoStatus,
        presencaSincronizadaEm: new Date(),
        teamsUltimoErro: null,
        ...(novoStatus === StatusAgendamento.ATENDIDO
          ? { motivoNaoAtendimentoId: null }
          : {}),
      },
      include: INCLUDE_AGENDAMENTO,
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

  const atualizado = await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: {
      status: StatusAgendamento.NAO_REALIZADO,
      presencaSincronizadaEm: new Date(),
    },
    include: INCLUDE_AGENDAMENTO,
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
