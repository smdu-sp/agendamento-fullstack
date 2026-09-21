/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { ICreateTipoAgendamento, ITipoAgendamento, IRespostaTipoAgendamento } from '@/types/tipo-agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function criar(data: ICreateTipoAgendamento): Promise<IRespostaTipoAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const existente = await prisma.tipoAgendamento.findUnique({ where: { texto: data.texto } });
		if (existente) {
			return { ok: false, error: 'Tipo de agendamento já cadastrado.', data: null, status: 403 };
		}

		const item = await prisma.tipoAgendamento.create({ data: { ...data, status: data.status ?? true } });

		revalidateTag('tipos-agendamento', 'max');
		return { ok: true, error: null, data: item as ITipoAgendamento, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar tipo de agendamento: ' + error, data: null, status: 500 };
	}
}
