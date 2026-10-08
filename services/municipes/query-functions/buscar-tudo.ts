/** @format */

'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { verificaPagina, verificaLimite } from '@/lib/paginacao';
import { IMunicipe, IPaginadoMunicipe, IRespostaMunicipe } from '@/types/municipe';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	status: string = '',
): Promise<IRespostaMunicipe> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		[pagina, limite] = verificaPagina(pagina, limite);
		const termo = busca.trim();

		const where: Prisma.MunicipeContaWhereInput = {
			...(termo && {
				OR: [{ nome: { contains: termo } }, { email: { contains: termo.toLowerCase() } }],
			}),
			...(status === 'ATIVO' && { status: true }),
			...(status === 'INATIVO' && { status: false }),
		};

		const total = await prisma.municipeConta.count({ where });
		if (total === 0) {
			return { ok: true, error: null, data: { total: 0, pagina: 0, limite: 0, data: [] }, status: 200 };
		}
		[pagina, limite] = verificaLimite(pagina, limite, total);

		const contas = await prisma.municipeConta.findMany({
			where,
			orderBy: { nome: 'asc' },
			skip: (pagina - 1) * limite,
			take: limite,
			select: {
				id: true,
				nome: true,
				email: true,
				status: true,
				ultimoLogin: true,
				criadoEm: true,
				atualizadoEm: true,
				_count: {
					select: { agendamentos: true, solicitacoesPreProjetoArthurSaboya: true },
				},
			},
		});

		const data: IPaginadoMunicipe = {
			total,
			pagina,
			limite,
			data: contas.map(
				({ _count, ...conta }): IMunicipe => ({
					...conta,
					totalAgendamentos: _count.agendamentos,
					totalSolicitacoesPreProjeto: _count.solicitacoesPreProjetoArthurSaboya,
				}),
			),
		};
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar a lista de munícipes.', data: null, status: 400 };
	}
}
