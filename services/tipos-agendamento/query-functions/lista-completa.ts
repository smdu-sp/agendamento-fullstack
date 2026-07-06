/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, AuthzError } from '@/lib/authz';
import { ITipoAgendamento, IRespostaTipoAgendamento } from '@/types/tipo-agendamento';

// Endpoint original não tem `@Permissoes`: qualquer usuário autenticado pode listar.
export async function listaCompleta(): Promise<IRespostaTipoAgendamento> {
	try {
		await requireUsuario();

		const lista = await prisma.tipoAgendamento.findMany({
			where: { status: true },
			orderBy: { texto: 'asc' },
		});

		return { ok: true, error: null, data: lista as ITipoAgendamento[], status: 200 };
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
