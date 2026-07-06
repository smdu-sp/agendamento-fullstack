/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { verificaPagina, verificaLimite } from '@/lib/paginacao';
import { IPaginadoTipoAgendamento, IRespostaTipoAgendamento } from '@/types/tipo-agendamento';
import type { Prisma } from '@prisma/client';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	status: string = '',
): Promise<IRespostaTipoAgendamento> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		[pagina, limite] = verificaPagina(pagina, limite);
		const where: Prisma.TipoAgendamentoWhereInput = {
			...(busca && { texto: { contains: busca } }),
			...(status &&
				status !== '' && {
					status: status === 'ATIVO' ? true : status === 'INATIVO' ? false : undefined,
				}),
		};

		const total = await prisma.tipoAgendamento.count({ where });
		if (total === 0) {
			return { ok: true, error: null, data: { total: 0, pagina: 0, limite: 0, data: [] }, status: 200 };
		}
		[pagina, limite] = verificaLimite(pagina, limite, total);
		const data = await prisma.tipoAgendamento.findMany({
			where,
			orderBy: { texto: 'asc' },
			skip: (pagina - 1) * limite,
			take: limite,
		});

		const resposta: IPaginadoTipoAgendamento = { total, pagina, limite, data };
		return { ok: true, error: null, data: resposta, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de tipos de agendamento:' + error,
			data: null,
			status: 400,
		};
	}
}
