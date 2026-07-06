/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaAgendamento } from '@/types/agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function excluir(id: string): Promise<IRespostaAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		await prisma.agendamento.delete({ where: { id } });

		revalidateTag('agendamentos');
		return { ok: true, error: null, data: { excluido: true }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao excluir agendamento.', data: null, status: 500 };
	}
}
