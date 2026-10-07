/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IAgendamento, IRespostaAgendamento } from '@/types/agendamento';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { INCLUDE_AGENDAMENTO } from '@/lib/agendamentos-core';
import { sincronizarReuniaoTeamsPendente } from '@/lib/agendamentos-teams';

export async function agendarReuniaoTeams(id: string): Promise<IRespostaAgendamento> {
  const usuario = await requireUsuarioOuRedirect();

  try {
    verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

    const ag = await prisma.agendamento.findUnique({
      where: { id },
      select: { coordenadoriaId: true, modalidade: true, status: true },
    });
    if (!ag) {
      return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
    }
    if (ag.modalidade === 'PRESENCIAL') {
      return { ok: false, error: 'Atendimento presencial não utiliza reunião Teams.', data: null, status: 400 };
    }
    if (!['SOLICITADO', 'AGENDADO'].includes(ag.status)) {
      return { ok: false, error: 'Estado do atendimento não permite criar ou atualizar reunião.', data: null, status: 400 };
    }

    const ehPFouCoord =
      usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
    const coordLogado = usuario.divisao?.coordenadoriaId ?? undefined;
    if (ehPFouCoord) {
      if (!coordLogado || ag.coordenadoriaId !== coordLogado) {
        throw new AuthzError('Você só pode agendar reuniões da sua coordenadoria.', 403);
      }
    }

    await prisma.agendamento.update({ where: { id }, data: {
      teamsSyncPendente: true, teamsSyncVersao: { increment: 1 }, teamsSyncTentativas: 0,
    } });
    const resultado = await sincronizarReuniaoTeamsPendente(id);
    const atualizado = await prisma.agendamento.findUnique({
      where: { id },
      include: INCLUDE_AGENDAMENTO,
    });

    revalidateTag('agendamentos', 'max');

    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Não foi possível criar a reunião no Teams.',
        data: atualizado as unknown as IAgendamento,
        status: 400,
      };
    }

    return {
      ok: true,
      error: null,
      data: atualizado as unknown as IAgendamento,
      status: 200,
    };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message, data: null, status: error.status };
    }
    return { ok: false, error: 'Erro ao agendar reunião no Teams.', data: null, status: 500 };
  }
}
