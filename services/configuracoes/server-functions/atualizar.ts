/** @format */

'use server';

import { IRespostaConfiguracao, IConfiguracaoReunioes, CHAVE_EMAIL_MARCADOR_REUNIOES } from '@/types/configuracao';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function atualizarEmailMarcador(
  emailMarcador: string,
): Promise<IRespostaConfiguracao> {
  const usuario = await requireUsuarioOuRedirect();

  try {
    verificarPermissoes(usuario, ['ADM', 'DEV']);

    const email = emailMarcador.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'Informe um e-mail válido.', data: null, status: 400 };
    }

    const row = await prisma.configuracaoSistema.upsert({
      where: { chave: CHAVE_EMAIL_MARCADOR_REUNIOES },
      create: {
        chave: CHAVE_EMAIL_MARCADOR_REUNIOES,
        valor: email,
        atualizadoPorId: usuario.id,
      },
      update: {
        valor: email,
        atualizadoPorId: usuario.id,
      },
      include: { atualizadoPor: { select: { nome: true } } },
    });

    const data: IConfiguracaoReunioes = {
      emailMarcador: row.valor,
      atualizadoEm: row.atualizadoEm.toISOString(),
      atualizadoPorNome: row.atualizadoPor?.nome ?? null,
    };

    return { ok: true, error: null, data, status: 200 };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message, data: null, status: error.status };
    }
    return { ok: false, error: 'Erro ao salvar configuração.', data: null, status: 500 };
  }
}
