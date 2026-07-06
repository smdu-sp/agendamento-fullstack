/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IUpdateDivisao, IDivisao, IRespostaDivisao } from '@/types/divisao';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_DIVISAO } from '../select-divisao';

export async function atualizar(id: string, data: IUpdateDivisao): Promise<IRespostaDivisao> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		if (data.sigla) {
			const existente = await prisma.divisao.findUnique({ where: { sigla: data.sigla } });
			if (existente && existente.id !== id) {
				return { ok: false, error: 'Sigla já cadastrada.', data: null, status: 403 };
			}
		}

		const divisaoAtualizada = await prisma.divisao.update({
			data,
			where: { id },
			select: SELECT_DIVISAO,
		});

		revalidateTag('divisoes');
		return { ok: true, error: null, data: divisaoAtualizada as IDivisao, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao atualizar divisão.', data: null, status: 500 };
	}
}
