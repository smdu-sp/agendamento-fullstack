/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaUsuario } from '@/types/usuario';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function autorizar(id: string): Promise<IRespostaUsuario> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV']);

		const autorizado = await prisma.usuario.update({ where: { id }, data: { status: true } });
		if (autorizado && autorizado.status === true) {
			revalidateTag('users');
			return { ok: true, error: null, data: { autorizado: true }, status: 200 };
		}
		return { ok: false, error: 'Erro ao autorizar o usuário.', data: null, status: 403 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao autorizar usuário.', data: null, status: 500 };
	}
}
