/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IUpdateMotivo, IMotivo, IRespostaMotivo } from '@/types/motivo';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function atualizar(id: string, data: IUpdateMotivo): Promise<IRespostaMotivo> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		if (data.texto) {
			const existente = await prisma.motivo.findUnique({ where: { texto: data.texto } });
			if (existente && existente.id !== id) {
				return { ok: false, error: 'Motivo já cadastrado.', data: null, status: 403 };
			}
		}

		const motivoAtualizado = await prisma.motivo.update({ data, where: { id } });

		revalidateTag('motivos', 'max');
		return { ok: true, error: null, data: motivoAtualizado as IMotivo, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao atualizar motivo: ' + error, data: null, status: 500 };
	}
}
