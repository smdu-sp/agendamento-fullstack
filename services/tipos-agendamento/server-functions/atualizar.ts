/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IUpdateTipoAgendamento, ITipoAgendamento, IRespostaTipoAgendamento } from '@/types/tipo-agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function atualizar(
	id: string,
	data: IUpdateTipoAgendamento,
): Promise<IRespostaTipoAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		if (data.texto) {
			const existente = await prisma.tipoAgendamento.findUnique({ where: { texto: data.texto } });
			if (existente && existente.id !== id) {
				return { ok: false, error: 'Tipo de agendamento já cadastrado.', data: null, status: 403 };
			}
		}

		const atualizado = await prisma.tipoAgendamento.update({ data, where: { id } });

		revalidateTag('tipos-agendamento');
		return { ok: true, error: null, data: atualizado as ITipoAgendamento, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao atualizar tipo de agendamento: ' + error, data: null, status: 500 };
	}
}
