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
import { criarReuniaoTeamsSePossivel } from '@/lib/agendamentos-teams';

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
				processo: true,
				tecnicoId: true,
				teamsEventId: true,
				tipoAgendamento: { select: { texto: true } },
			},
		});
		if (!agendamentoAtual) {
			return { ok: false, error: 'Agendamento não encontrado.', data: null, status: 404 };
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
			coordenadoriaId: data.coordenadoriaId,
			motivoNaoAtendimentoId: data.motivoNaoAtendimentoId,
			status: data.status,
			tecnicoRF: data.tecnicoRF,
			municipe: data.municipe ? padronizarNome(data.municipe) : undefined,
			tecnicoId,
		};

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

		const agendamentoAtualizado = await prisma.agendamento.update({
			data: dataAtualizacao,
			where: { id },
			include: INCLUDE_AGENDAMENTO,
		});

		const tecnicoFoiAtribuido =
			!!tecnicoId &&
			!agendamentoAtual.tecnicoId &&
			!agendamentoAtual.teamsEventId &&
			agendamentoAtualizado.status === StatusAgendamento.SOLICITADO;
		if (tecnicoFoiAtribuido) {
			await criarReuniaoTeamsSePossivel(id);
		}

		const agendamentoResposta = tecnicoFoiAtribuido
			? await prisma.agendamento.findUnique({
					where: { id },
					include: INCLUDE_AGENDAMENTO,
				})
			: agendamentoAtualizado;

		// Pré-projeto Arthur Saboya: SOLICITADO -> AGENDADO marca a solicitação e avisa o munícipe.
		const tipoPreArthur =
			(agendamentoAtual.tipoAgendamento?.texto ?? '').trim() === PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO;
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

		revalidateTag('agendamentos');
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
		return { ok: false, error: 'Erro ao atualizar agendamento.', data: null, status: 500 };
	}
}
