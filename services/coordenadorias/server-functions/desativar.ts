/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaCoordenadoria } from '@/types/coordenadoria';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function desativar(id: string): Promise<IRespostaCoordenadoria> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		await prisma.coordenadoria.update({
			data: { status: false },
			where: { id },
		});

		revalidateTag('coordenadorias', 'max');
		return { ok: true, error: null, data: { desativado: true }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao desativar coordenadoria.', data: null, status: 500 };
	}
}
