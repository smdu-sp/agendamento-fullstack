/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import {
	Prisma,
	StatusAgendamento,
	StatusSolicitacaoPreProjeto,
	AutorMensagemPreProjetoArthurSaboya,
} from '@prisma/client';
import { IUpdateAgendamento, IAgendamento, IRespostaAgendamento } from '@/types/agendamento';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import {
	INCLUDE_AGENDAMENTO,
	PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO,
	PRE_PROJETO_DURACAO_ATENDIMENTO_MINUTOS,
	buscarOuCriarTecnicoPorRF,
	calcularDataFim,
	divisaoIdDoTecnico,
	formatarDataHoraSaoPaulo,
	padronizarNome,
	usuarioPodeSerTecnicoAtribuido,
} from '@/lib/agendamentos-core';
import { criarReuniaoTeamsSePossivel, sincronizarReuniaoTeamsPendente } from '@/lib/agendamentos-teams';
import { bloquearTecnicos, exigirSlotLivre } from '@/lib/agenda-tecnicos';
import { statusTerminal, validarTransicaoAgendamento } from '@/lib/agendamento-transicoes';

export async function atualizar(id: string, data: IUpdateAgendamento): Promise<IRespostaAgendamento> {
	const usuarioLogado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuarioLogado, ['ADM', 'DEV', 'TEC', 'PONTO_FOCAL', 'COORDENADOR']);

		const agendamentoAtual = await prisma.agendamento.findUnique({
			where: { id },
			select: {
				coordenadoriaId: true,
				status: true,
				dataHora: true,
				dataFim: true,
				processo: true,
				tecnicoId: true,
				teamsEventId: true,
				modalidade: true,
				localAtendimento: true,
				origemPortalProcesso: true,
				encaminhadoReservaEm: true,
				tipoAgendamento: { select: { texto: true } },
			},
		});
		if (!agendamentoAtual) {
			return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
		}
		if (usuarioLogado.permissao === 'TEC' && usuarioLogado.permissaoReal !== 'DEV') {
			if (agendamentoAtual.tecnicoId !== usuarioLogado.id) {
				throw new AuthzError('Você só pode atualizar seus próprios atendimentos.', 403);
			}
			const campos = Object.entries(data).filter(([, valor]) => valor !== undefined).map(([chave]) => chave);
			if (campos.some((campo) => !['status', 'motivoNaoAtendimentoId'].includes(campo))) {
				throw new AuthzError('Técnicos só podem registrar o resultado do próprio atendimento.', 403);
			}
			if (data.status && data.status !== StatusAgendamento.ATENDIDO && data.status !== StatusAgendamento.NAO_REALIZADO && data.status !== StatusAgendamento.CONCLUIDO) {
				throw new AuthzError('Resultado de atendimento inválido para o técnico.', 403);
			}
		}
		if (data.status) validarTransicaoAgendamento(agendamentoAtual.status, data.status as StatusAgendamento);
		if (statusTerminal(agendamentoAtual.status) && Object.values(data).some((valor) => valor !== undefined)) {
			throw new Error('Agendamento finalizado não pode ser alterado.');
		}
		if (data.status === StatusAgendamento.CANCELADO && (data.motivoCancelamento?.trim().length ?? 0) < 5) {
			throw new Error('Informe o motivo do cancelamento (mínimo de 5 caracteres).');
		}

		const ehPFouCoord =
			usuarioLogado.permissao === 'PONTO_FOCAL' || usuarioLogado.permissao === 'COORDENADOR';
		const coordLogado = usuarioLogado.divisao?.coordenadoriaId ?? undefined;

		// PF/COORD só atualizam agendamentos da sua coordenadoria.
		if (ehPFouCoord) {
			if (!coordLogado) {
				throw new AuthzError('Você não possui coordenadoria atribuída.', 403);
			}
			if (agendamentoAtual.coordenadoriaId !== coordLogado) {
				throw new AuthzError('Você só pode atualizar agendamentos da sua coordenadoria.', 403);
			}
			if (data.coordenadoriaId && data.coordenadoriaId !== coordLogado) {
				throw new AuthzError('Você não pode alterar a coordenadoria do agendamento.', 403);
			}
		}

		let tecnicoId = data.tecnicoId;
		if (tecnicoId) {
			const tecnico = await prisma.usuario.findUnique({
				where: { id: tecnicoId },
				select: { permissao: true, divisaoId: true, divisao: { select: { coordenadoriaId: true } } },
			});
			if (!tecnico) {
				return { ok: false, error: 'Técnico não encontrado.', data: null, status: 404 };
			}
			if (!usuarioPodeSerTecnicoAtribuido(tecnico)) {
				throw new AuthzError('Somente técnicos ou DEV com unidade podem ser atribuídos.', 403);
			}
			if (ehPFouCoord && tecnico.divisao?.coordenadoriaId !== coordLogado) {
				throw new AuthzError('Você só pode atribuir técnicos da sua coordenadoria.', 403);
			}
		}

		let coordenadoriaIdParaTecnico: string | undefined =
			data.coordenadoriaId || agendamentoAtual.coordenadoriaId || undefined;

		if (data.tecnicoRF && !tecnicoId) {
			tecnicoId = (await buscarOuCriarTecnicoPorRF(data.tecnicoRF, coordenadoriaIdParaTecnico)) ?? undefined;
			if (ehPFouCoord && tecnicoId) {
				const tecnico = await prisma.usuario.findUnique({
					where: { id: tecnicoId },
					select: { divisao: { select: { coordenadoriaId: true } } },
				});
				if (tecnico && tecnico.divisao?.coordenadoriaId !== coordLogado) {
					throw new AuthzError('O técnico encontrado não pertence à sua coordenadoria.', 403);
				}
			}
		}
		void coordenadoriaIdParaTecnico;

		const dataAtualizacao: Prisma.AgendamentoUncheckedUpdateInput = {
			cpf: data.cpf,
			processo: data.processo,
			resumo: data.resumo,
			email: data.email,
			localAtendimento: data.localAtendimento?.trim(),
			sala: data.sala?.trim(),
			orientacaoAcesso: data.orientacaoAcesso?.trim(),
			coordenadoriaId: data.coordenadoriaId,
			motivoNaoAtendimentoId: data.motivoNaoAtendimentoId,
			status: data.status,
			motivoCancelamento: data.status === StatusAgendamento.CANCELADO ? data.motivoCancelamento?.trim() : undefined,
			canceladoEm: data.status === StatusAgendamento.CANCELADO ? new Date() : undefined,
			canceladoPorId: data.status === StatusAgendamento.CANCELADO ? usuarioLogado.id : undefined,
			tecnicoRF: data.tecnicoRF,
			municipe: data.municipe ? padronizarNome(data.municipe) : undefined,
			tecnicoId,
		};
		if (
			data.status === StatusAgendamento.AGENDADO &&
			agendamentoAtual.modalidade === 'PRESENCIAL' &&
			!(data.localAtendimento?.trim() || agendamentoAtual.localAtendimento?.trim())
		) {
			return { ok: false, error: 'Informe o local antes de confirmar o atendimento presencial.', data: null, status: 400 };
		}

		if (data.dataHora) {
			const dataHora = new Date(data.dataHora);
			dataAtualizacao.dataHora = dataHora;
			if (!data.dataFim) {
				const duracaoMin =
					agendamentoAtual.tipoAgendamento?.texto?.trim() === PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO
						? PRE_PROJETO_DURACAO_ATENDIMENTO_MINUTOS
						: 60;
				dataAtualizacao.dataFim = calcularDataFim(dataHora, duracaoMin);
			}
		}
		if (data.dataFim) {
			dataAtualizacao.dataFim = new Date(data.dataFim);
		}

		// Ao marcar como ATENDIDO ou AGENDADO, limpa o motivo de não atendimento.
		if (data.status === 'ATENDIDO' || data.status === 'AGENDADO') {
			dataAtualizacao.motivoNaoAtendimentoId = null;
		}

		if ('tecnicoId' in data || 'tecnicoRF' in data) {
			dataAtualizacao.divisaoId = await divisaoIdDoTecnico(tecnicoId ?? null);
		}

		const destinoTecnicoId = tecnicoId === undefined ? agendamentoAtual.tecnicoId : tecnicoId;
		const movimentaReserva = !!destinoTecnicoId &&
			(tecnicoId !== undefined || !!data.dataHora || !!data.dataFim || data.status === StatusAgendamento.AGENDADO);
		const agendamentoAtualizado = await prisma.$transaction(async (tx) => {
				await bloquearTecnicos(tx, [agendamentoAtual.tecnicoId, destinoTecnicoId].filter((v): v is string => !!v));
				await tx.$queryRaw`SELECT id FROM agendamentos WHERE id = ${id} FOR UPDATE`;
				const atual = await tx.agendamento.findUnique({ where: { id }, select: {
					tecnicoId: true, dataHora: true, dataFim: true, status: true, modalidade: true,
				} });
				if (!atual) throw new Error('Agendamento não encontrado.');
				if (atual.tecnicoId !== agendamentoAtual.tecnicoId ||
					atual.dataHora.getTime() !== agendamentoAtual.dataHora.getTime() ||
					atual.status !== agendamentoAtual.status) {
					throw new Error('O agendamento foi alterado por outra pessoa. Atualize a página.');
				}
				if (data.status) validarTransicaoAgendamento(atual.status, data.status as StatusAgendamento);
				const inicio = data.dataHora ? new Date(data.dataHora) : atual.dataHora;
				const fim = data.dataFim ? new Date(data.dataFim) :
					(data.dataHora ? dataAtualizacao.dataFim as Date : atual.dataFim ?? calcularDataFim(inicio));
				if (movimentaReserva && atual.modalidade && data.status !== StatusAgendamento.CANCELADO && data.status !== StatusAgendamento.NAO_REALIZADO) {
					await exigirSlotLivre(tx, destinoTecnicoId, inicio, fim, atual.modalidade!, id);
				}
				if (agendamentoAtual.teamsEventId && (atual.tecnicoId !== destinoTecnicoId ||
					atual.dataHora.getTime() !== inicio.getTime() || !!data.dataFim || !!data.email || !!data.municipe ||
					!!data.coordenadoriaId || data.status === StatusAgendamento.CANCELADO)) {
					dataAtualizacao.teamsSyncPendente = true;
					dataAtualizacao.teamsSyncVersao = { increment: 1 };
					dataAtualizacao.teamsSyncTentativas = 0;
				}
				const atualizado = await tx.agendamento.update({ data: dataAtualizacao, where: { id }, include: INCLUDE_AGENDAMENTO });
				if (atual.tecnicoId !== destinoTecnicoId || atual.dataHora.getTime() !== inicio.getTime()) {
					await tx.eventoAgendamento.create({ data: {
						agendamentoId: id, atorId: usuarioLogado.id,
						tipo: agendamentoAtual.encaminhadoReservaEm && agendamentoAtual.tecnicoId === null && destinoTecnicoId
							? 'ATRIBUIDO_RESERVA' : 'REATRIBUIDO_OU_REMARCADO',
						dados: { tecnicoAnteriorId: atual.tecnicoId, tecnicoNovoId: destinoTecnicoId,
							horarioAnterior: atual.dataHora.toISOString(), horarioNovo: inicio.toISOString() },
					} });
				}
				if (data.status && data.status !== atual.status) {
					await tx.eventoAgendamento.create({ data: {
						agendamentoId: id, atorId: usuarioLogado.id, tipo: 'STATUS_ALTERADO',
						dados: { anterior: atual.status, novo: data.status, motivo: data.motivoCancelamento?.trim() ?? null },
					} });
				}
				return atualizado;
			});

		const tipoPreArthur =
			(agendamentoAtual.tipoAgendamento?.texto ?? '').trim() === PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO;
		const tecnicoFoiAtribuido =
			!!tecnicoId &&
			!agendamentoAtual.tecnicoId &&
			!agendamentoAtual.teamsEventId &&
			agendamentoAtualizado.status === StatusAgendamento.SOLICITADO;
		// Arthur Saboya: o ponto focal dispara a reunião pelo botão do chamado.
		if (tecnicoFoiAtribuido && !tipoPreArthur && agendamentoAtualizado.modalidade !== 'PRESENCIAL') {
			await criarReuniaoTeamsSePossivel(id);
		}
		if (agendamentoAtualizado.teamsSyncPendente) {
			await sincronizarReuniaoTeamsPendente(id);
		}

		const agendamentoResposta = tecnicoFoiAtribuido
			? await prisma.agendamento.findUnique({
					where: { id },
					include: INCLUDE_AGENDAMENTO,
				})
			: agendamentoAtualizado;

		// Pré-projeto Arthur Saboya: SOLICITADO -> AGENDADO marca a solicitação e avisa o munícipe.
		const passouParaAgendado =
			data.status === StatusAgendamento.AGENDADO &&
			agendamentoAtual.status === StatusAgendamento.SOLICITADO;
		if (tipoPreArthur && passouParaAgendado) {
			const proc = (agendamentoAtualizado.processo ?? '').trim().toUpperCase();
			const sol = await prisma.solicitacaoPreProjetoArthurSaboya.findFirst({
				where: {
					OR: [
						{ agendamentoId: id },
						...(proc.startsWith('PP-') || proc.startsWith('AS-') ? [{ protocolo: proc }] : []),
					],
				},
				select: { id: true },
			});
			if (sol) {
				const dataRef = agendamentoAtualizado.dataHora;
				await prisma.solicitacaoPreProjetoArthurSaboya.update({
					where: { id: sol.id },
					data: { status: StatusSolicitacaoPreProjeto.AGENDAMENTO_CRIADO },
				});
				await prisma.solicitacaoPreProjetoArthurSaboyaMensagem.create({
					data: {
						solicitacaoId: sol.id,
						autor: AutorMensagemPreProjetoArthurSaboya.SISTEMA,
						corpo: `O atendimento técnico foi agendado para o dia ${formatarDataHoraSaoPaulo(
							dataRef,
						)}. O atendimento será realizado de forma online, por meio do link enviado para o seu e-mail. Caso não possa comparecer, solicitamos que cancele o agendamento pelo botão Cancelar Atendimento.`,
					},
				});
			}
		}

		revalidateTag('agendamentos', 'max');
		return {
			ok: true,
			error: null,
			data: (agendamentoResposta ?? agendamentoAtualizado) as unknown as IAgendamento,
			status: 200,
		};
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		if (error instanceof Error && /horário não está disponível|alterado por outra pessoa|Intervalo de atendimento|Transição de|Agendamento finalizado|motivo do cancelamento/.test(error.message)) {
			return { ok: false, error: error.message, data: null, status: 409 };
		}
		return { ok: false, error: 'Erro ao atualizar agendamento.', data: null, status: 500 };
	}
}
