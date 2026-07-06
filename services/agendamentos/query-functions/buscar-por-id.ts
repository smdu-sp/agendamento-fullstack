/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { INCLUDE_AGENDAMENTO } from '@/lib/agendamentos-core';
import { IAgendamento, IRespostaAgendamento } from '@/types/agendamento';

export async function buscarPorId(id: string): Promise<IRespostaAgendamento> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'TEC', 'PONTO_FOCAL', 'COORDENADOR', 'PORTARIA', 'DIRETOR']);

		const agendamento = await prisma.agendamento.findUnique({
			where: { id },
			include: INCLUDE_AGENDAMENTO,
		});
		if (!agendamento) {
			return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
		}

		return { ok: true, error: null, data: agendamento as unknown as IAgendamento, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar o agendamento:' + error, data: null, status: 400 };
	}
}
