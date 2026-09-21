/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaAgendamento, IResultadoPresenca } from '@/types/agendamento';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { sincronizarPresencaInterno } from '@/lib/agendamentos-teams';

export async function sincronizarPresenca(
  id: string,
  force: boolean = false,
): Promise<IRespostaAgendamento> {
  const usuario = await requireUsuarioOuRedirect();

  try {
    verificarPermissoes(usuario, [
      'ADM',
      'DEV',
      'TEC',
      'PONTO_FOCAL',
      'COORDENADOR',
    ]);

    const ag = await prisma.agendamento.findUnique({
      where: { id },
      select: { coordenadoriaId: true, tecnicoId: true },
    });
    if (!ag) {
      return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
    }

    if (usuario.permissao === 'TEC' && ag.tecnicoId !== usuario.id) {
      throw new AuthzError('Você só pode sincronizar presença dos seus agendamentos.', 403);
    }

    const ehPFouCoord =
      usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
    const coordLogado = usuario.divisao?.coordenadoriaId ?? undefined;
    if (ehPFouCoord) {
      if (!coordLogado || ag.coordenadoriaId !== coordLogado) {
        throw new AuthzError('Você só pode sincronizar reuniões da sua coordenadoria.', 403);
      }
    }

    const resultado = await sincronizarPresencaInterno(id, { force });
    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Não foi possível sincronizar a presença.',
        data: null,
        status: 400,
      };
    }

    if (resultado.statusAlterado) {
      revalidateTag('agendamentos', 'max');
    }

    const data: IResultadoPresenca = {
      statusAlterado: resultado.statusAlterado,
      aguardandoRelatorio: resultado.aguardandoRelatorio,
      temPresenca: resultado.temPresenca,
      agendamento: resultado.agendamento,
    };

    return { ok: true, error: null, data, status: 200 };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message, data: null, status: error.status };
    }
    return { ok: false, error: 'Erro ao sincronizar presença.', data: null, status: 500 };
  }
}
