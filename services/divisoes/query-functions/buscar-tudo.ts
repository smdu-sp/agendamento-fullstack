/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { verificaPagina, verificaLimite } from '@/lib/paginacao';
import { IDivisao, IPaginadoDivisao, IRespostaDivisao } from '@/types/divisao';
import { SELECT_DIVISAO } from '../select-divisao';
import type { Prisma } from '@prisma/client';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	status: string = '',
	coordenadoriaId: string = '',
): Promise<IRespostaDivisao> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		[pagina, limite] = verificaPagina(pagina, limite);
		const where: Prisma.DivisaoWhereInput = {
			...(coordenadoriaId && { coordenadoriaId }),
			...(busca && {
				OR: [{ sigla: { contains: busca } }, { nome: { contains: busca } }],
			}),
			...(status &&
				status !== '' && {
					status: status === 'ATIVO' ? true : status === 'INATIVO' ? false : undefined,
				}),
		};

		const total = await prisma.divisao.count({ where });
		if (total === 0) {
			return { ok: true, error: null, data: { total: 0, pagina: 0, limite: 0, data: [] }, status: 200 };
		}
		[pagina, limite] = verificaLimite(pagina, limite, total);
		const divisoes = await prisma.divisao.findMany({
			where,
			orderBy: { sigla: 'asc' },
			skip: (pagina - 1) * limite,
			take: limite,
			select: SELECT_DIVISAO,
		});

		const data: IPaginadoDivisao = { total, pagina, limite, data: divisoes as IDivisao[] };
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar divisões: ' + error, data: null, status: 400 };
	}
}
