/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IAgendamento, IRespostaAgendamento } from '@/types/agendamento';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { INCLUDE_AGENDAMENTO } from '@/lib/agendamentos-core';
import { cancelarReuniaoTeamsInterno } from '@/lib/agendamentos-teams';

export async function cancelarReuniaoTeams(
  id: string,
  motivo: string,
): Promise<IRespostaAgendamento> {
  const usuario = await requireUsuarioOuRedirect();

  try {
    verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

    const ag = await prisma.agendamento.findUnique({
      where: { id },
      select: { coordenadoriaId: true },
    });
    if (!ag) {
      return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
    }

    const ehPFouCoord =
      usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
    const coordLogado = usuario.divisao?.coordenadoriaId ?? undefined;
    if (ehPFouCoord) {
      if (!coordLogado || ag.coordenadoriaId !== coordLogado) {
        throw new AuthzError('Você só pode cancelar reuniões da sua coordenadoria.', 403);
      }
    }

    const resultado = await cancelarReuniaoTeamsInterno(id, motivo, usuario.id);
    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Não foi possível cancelar a reunião.',
        data: null,
        status: 400,
      };
    }

    const atualizado = await prisma.agendamento.findUnique({
      where: { id },
      include: INCLUDE_AGENDAMENTO,
    });
    revalidateTag('agendamentos');
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
    return { ok: false, error: 'Erro ao cancelar reunião.', data: null, status: 500 };
  }
}
