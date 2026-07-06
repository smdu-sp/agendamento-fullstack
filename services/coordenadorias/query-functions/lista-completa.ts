/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, AuthzError } from '@/lib/authz';
import { ICoordenadoria, IRespostaCoordenadoria } from '@/types/coordenadoria';

// Endpoint original não tem `@Permissoes` no controller: qualquer usuário
// autenticado (independente da permissão) pode listar. Precisa ser Server
// Action ('use server') pois é chamada também a partir de Client Components.
export async function listaCompleta(): Promise<IRespostaCoordenadoria> {
	try {
		await requireUsuario();

		const lista = await prisma.coordenadoria.findMany({
			where: { status: true },
			orderBy: { sigla: 'asc' },
		});

		return { ok: true, error: null, data: lista as ICoordenadoria[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de coordenadorias:' + error,
			data: null,
			status: 400,
		};
	}
}
