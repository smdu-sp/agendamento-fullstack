/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { IDivisao, IRespostaDivisao } from '@/types/divisao';
import { SELECT_DIVISAO } from '../select-divisao';

export async function buscarPorId(id: string): Promise<IRespostaDivisao> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const divisao = await prisma.divisao.findUnique({ where: { id }, select: SELECT_DIVISAO });
		if (!divisao) {
			return { ok: false, error: 'Divisão não encontrada.', data: null, status: 404 };
		}

		return { ok: true, error: null, data: divisao as IDivisao, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar a divisão: ' + error, data: null, status: 400 };
	}
}
