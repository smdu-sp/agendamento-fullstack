/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, AuthzError } from '@/lib/authz';
import { IMotivo, IRespostaMotivo } from '@/types/motivo';

// Endpoint original não tem `@Permissoes`: qualquer usuário autenticado pode listar.
export async function listaCompleta(): Promise<IRespostaMotivo> {
	try {
		await requireUsuario();

		const lista = await prisma.motivo.findMany({
			where: { status: true },
			orderBy: { texto: 'asc' },
		});

		return { ok: true, error: null, data: lista as IMotivo[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de motivos:' + error,
			data: null,
			status: 400,
		};
	}
}
