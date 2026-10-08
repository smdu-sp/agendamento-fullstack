/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { IRespostaMunicipe } from '@/types/municipe';

/** Ativa ou desativa a conta. Conta inativa não entra no portal e perde a sessão atual. */
export async function alterarStatus(id: string, status: boolean): Promise<IRespostaMunicipe> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV']);

		const alvo = await prisma.municipeConta.findUnique({ where: { id }, select: { id: true } });
		if (!alvo) {
			return { ok: false, error: 'Munícipe não encontrado.', data: null, status: 404 };
		}

		await prisma.municipeConta.update({ where: { id }, data: { status } });
		return { ok: true, error: null, data: { status }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao alterar a situação do munícipe.', data: null, status: 500 };
	}
}
