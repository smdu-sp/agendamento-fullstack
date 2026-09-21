/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaUsuario } from '@/types/usuario';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function desativar(id: string): Promise<IRespostaUsuario> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const alvo = await prisma.usuario.findUnique({ where: { id }, select: { divisaoId: true } });
		if (!alvo) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 404 };
		}

		// Ponto Focal e Coordenador só podem desativar usuários da sua divisão.
		if (logado.permissao === 'PONTO_FOCAL' || logado.permissao === 'COORDENADOR') {
			if (alvo.divisaoId !== logado.divisaoId) {
				throw new AuthzError('Você só pode desativar usuários da sua divisão.', 403);
			}
		}

		await prisma.usuario.update({ where: { id }, data: { status: false } });

		revalidateTag('users', 'max');
		return { ok: true, error: null, data: { desativado: true }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao desativar usuário.', data: null, status: 500 };
	}
}
