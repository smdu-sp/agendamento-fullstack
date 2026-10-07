/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaAgendamento } from '@/types/agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { cancelarReuniaoTeamsInterno } from '@/lib/agendamentos-teams';
import { validarTransicaoAgendamento } from '@/lib/agendamento-transicoes';
import { StatusAgendamento } from '@prisma/client';
import { INCLUDE_AGENDAMENTO } from '@/lib/agendamentos-core';
import type { IAgendamento } from '@/types/agendamento';

export async function excluir(id: string): Promise<IRespostaAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const atual = await prisma.agendamento.findUnique({ where: { id }, select: { status: true, teamsEventId: true } });
		if (!atual) return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
		if (atual.status === StatusAgendamento.CANCELADO) return { ok: false, error: 'Agendamento já cancelado.', data: null, status: 400 };
		validarTransicaoAgendamento(atual.status, StatusAgendamento.CANCELADO);
		const motivo = 'Cancelado pela administração.';
		if (atual.teamsEventId) {
			const resultado = await cancelarReuniaoTeamsInterno(id, motivo, usuario.id);
			if (!resultado.ok) return { ok: false, error: resultado.error ?? 'Falha ao cancelar reunião.', data: null, status: 400 };
		} else {
			await prisma.$transaction(async (tx) => {
				const alterado = await tx.agendamento.updateMany({
					where: { id, status: atual.status },
					data: { status: StatusAgendamento.CANCELADO, motivoCancelamento: motivo, canceladoEm: new Date(), canceladoPorId: usuario.id },
				});
				if (!alterado.count) throw new Error('O agendamento foi alterado por outra pessoa.');
				await tx.eventoAgendamento.create({ data: {
					agendamentoId: id, atorId: usuario.id, tipo: 'CANCELADO', dados: { statusAnterior: atual.status, motivo },
				} });
			});
		}

		revalidateTag('agendamentos', 'max');
		const cancelado = await prisma.agendamento.findUnique({ where: { id }, include: INCLUDE_AGENDAMENTO });
		return { ok: true, error: null, data: cancelado as unknown as IAgendamento, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		if (error instanceof Error && /Transição de|alterado por outra pessoa/.test(error.message)) {
			return { ok: false, error: error.message, data: null, status: 409 };
		}
		return { ok: false, error: 'Erro ao excluir agendamento.', data: null, status: 500 };
	}
}
