/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaMotivo } from '@/types/motivo';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function desativar(id: string): Promise<IRespostaMotivo> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		await prisma.motivo.update({ data: { status: false }, where: { id } });

		revalidateTag('motivos');
		return { ok: true, error: null, data: { desativado: true }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao desativar motivo: ' + error, data: null, status: 500 };
	}
}
