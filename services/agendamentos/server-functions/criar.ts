/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { StatusAgendamento } from '@prisma/client';
import { ICreateAgendamento, IAgendamento, IRespostaAgendamento } from '@/types/agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import {
	INCLUDE_AGENDAMENTO,
	PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO,
	buscarOuCriarTecnicoPorRF,
	calcularDataFim,
	divisaoIdDoTecnico,
	padronizarNome,
} from '@/lib/agendamentos-core';

export async function criar(data: ICreateAgendamento): Promise<IRespostaAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const { tecnicoRF, ...restDto } = data;
		const tipoAgendamentoId = restDto.tipoAgendamentoId;

		// Pedidos de pré-projetos (Arthur Saboya) não são criados por esta tela.
		if (tipoAgendamentoId) {
			const tipoRow = await prisma.tipoAgendamento.findUnique({
				where: { id: tipoAgendamentoId },
				select: { texto: true },
			});
			if (tipoRow?.texto?.trim() === PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO) {
				return {
					ok: false,
					error:
						'Pedidos de pré-projetos (Arthur Saboya) são tratados apenas no menu Pedidos Arthur Saboya, não na criação de agendamentos.',
					data: null,
					status: 400,
				};
			}
		}

		let tecnicoId = restDto.tecnicoId;
		if (tecnicoRF && !tecnicoId) {
			tecnicoId = (await buscarOuCriarTecnicoPorRF(tecnicoRF, restDto.coordenadoriaId)) ?? undefined;
		}

		const dataHora = new Date(restDto.dataHora);
		const dataFim = restDto.dataFim ? new Date(restDto.dataFim) : calcularDataFim(dataHora, 60);

		// Impede duplicata: mesmo processo + mesma data/hora.
		const processoTrim = restDto.processo?.trim();
		if (processoTrim) {
			const existente = await prisma.agendamento.findFirst({
				where: { processo: processoTrim, dataHora },
			});
			if (existente) {
				return {
					ok: false,
					error: 'Já existe um agendamento com este processo e data/hora.',
					data: null,
					status: 400,
				};
			}
		}

		const statusInicial = processoTrim ? StatusAgendamento.AGENDADO : StatusAgendamento.SOLICITADO;
		const divisaoId = await divisaoIdDoTecnico(tecnicoId ?? null);

		const agendamento = await prisma.agendamento.create({
			data: {
				municipe: restDto.municipe ? padronizarNome(restDto.municipe) : null,
				cpf: restDto.cpf,
				processo: restDto.processo,
				resumo: restDto.resumo,
				email: restDto.email,
				coordenadoriaId: restDto.coordenadoriaId,
				tipoAgendamentoId,
				status: statusInicial,
				tecnicoId,
				divisaoId,
				dataHora,
				dataFim,
			},
			include: INCLUDE_AGENDAMENTO,
		});

		revalidateTag('agendamentos', 'max');
		return { ok: true, error: null, data: agendamento as unknown as IAgendamento, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar novo agendamento.', data: null, status: 500 };
	}
}
