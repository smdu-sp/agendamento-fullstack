/** @format */

'use server';

import { IConfiguracaoReunioes, IRespostaConfiguracao, CHAVE_EMAIL_MARCADOR_REUNIOES } from '@/types/configuracao';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function buscarConfiguracaoReunioes(): Promise<IRespostaConfiguracao> {
  try {
    const usuario = await requireUsuario();
    verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

    const row = await prisma.configuracaoSistema.findUnique({
      where: { chave: CHAVE_EMAIL_MARCADOR_REUNIOES },
      include: { atualizadoPor: { select: { nome: true } } },
    });

    const data: IConfiguracaoReunioes = {
      emailMarcador: row?.valor?.trim() || '',
      atualizadoEm: row?.atualizadoEm ? row.atualizadoEm.toISOString() : null,
      atualizadoPorNome: row?.atualizadoPor?.nome ?? null,
    };

    return { ok: true, error: null, data, status: 200 };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message, data: null, status: error.status };
    }
    return { ok: false, error: 'Erro ao buscar configurações.', data: null, status: 500 };
  }
}
