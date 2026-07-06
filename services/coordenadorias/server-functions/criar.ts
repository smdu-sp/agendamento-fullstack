/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { ICreateCoordenadoria, ICoordenadoria, IRespostaCoordenadoria } from '@/types/coordenadoria';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function criar(data: ICreateCoordenadoria): Promise<IRespostaCoordenadoria> {
	// Fora do try/catch: redirect() lança um sinal especial do Next.js que não
	// pode ser engolido por um catch genérico.
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const existente = await prisma.coordenadoria.findUnique({ where: { sigla: data.sigla } });
		if (existente) {
			return { ok: false, error: 'Sigla já cadastrada.', data: null, status: 403 };
		}

		const coordenadoria = await prisma.coordenadoria.create({
			data: { ...data, status: data.status ?? true },
		});

		revalidateTag('coordenadorias');
		return { ok: true, error: null, data: coordenadoria as ICoordenadoria, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar nova coordenadoria.', data: null, status: 500 };
	}
}
