/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { ICreateMotivo, IMotivo, IRespostaMotivo } from '@/types/motivo';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function criar(data: ICreateMotivo): Promise<IRespostaMotivo> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const existente = await prisma.motivo.findUnique({ where: { texto: data.texto } });
		if (existente) {
			return { ok: false, error: 'Motivo já cadastrado.', data: null, status: 403 };
		}

		const motivo = await prisma.motivo.create({ data: { ...data, status: data.status ?? true } });

		revalidateTag('motivos', 'max');
		return { ok: true, error: null, data: motivo as IMotivo, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar motivo: ' + error, data: null, status: 500 };
	}
}
