/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { ICreateDivisao, IDivisao, IRespostaDivisao } from '@/types/divisao';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_DIVISAO } from '../select-divisao';

export async function criar(data: ICreateDivisao): Promise<IRespostaDivisao> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const existente = await prisma.divisao.findUnique({ where: { sigla: data.sigla } });
		if (existente) {
			return { ok: false, error: 'Sigla já cadastrada.', data: null, status: 403 };
		}

		const divisao = await prisma.divisao.create({
			data: { ...data, status: data.status ?? true },
			select: SELECT_DIVISAO,
		});

		revalidateTag('divisoes');
		return { ok: true, error: null, data: divisao as IDivisao, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar nova divisão.', data: null, status: 500 };
	}
}
