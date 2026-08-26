/** @format */

'use server';

import { IRespostaConfiguracao } from '@/types/configuracao';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { testarConexaoGraphInterno, obterEmailMarcadorReunioes } from '@/lib/agendamentos-teams';

export async function testarConexaoGraph(
  emailMarcador?: string,
): Promise<IRespostaConfiguracao> {
  const usuario = await requireUsuarioOuRedirect();

  try {
    verificarPermissoes(usuario, ['ADM', 'DEV']);

    const email = (emailMarcador?.trim() || (await obterEmailMarcadorReunioes()) || '');
    const resultado = await testarConexaoGraphInterno(email);
    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Falha ao testar o Graph.',
        data: null,
        status: 400,
      };
    }

    return {
      ok: true,
      error: null,
      data: { displayName: resultado.displayName, mail: resultado.mail },
      status: 200,
    };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message, data: null, status: error.status };
    }
    return { ok: false, error: 'Erro ao testar conexão com o Graph.', data: null, status: 500 };
  }
}
