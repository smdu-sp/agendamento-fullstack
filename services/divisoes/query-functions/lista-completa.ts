/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, AuthzError } from '@/lib/authz';
import { IDivisao, IRespostaDivisao } from '@/types/divisao';
import { SELECT_DIVISAO } from '../select-divisao';

// Endpoint original não tem `@Permissoes`: qualquer usuário autenticado pode listar.
export async function listaCompleta(coordenadoriaId?: string): Promise<IRespostaDivisao> {
	try {
		await requireUsuario();

		const lista = await prisma.divisao.findMany({
			where: { status: true, ...(coordenadoriaId && { coordenadoriaId }) },
			orderBy: { sigla: 'asc' },
			select: SELECT_DIVISAO,
		});

		return { ok: true, error: null, data: lista as IDivisao[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de divisões: ' + error,
			data: null,
			status: 400,
		};
	}
}
