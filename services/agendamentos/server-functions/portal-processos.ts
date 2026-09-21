/** @format */

"use server";

import { ConferenciaCapStatus, StatusAgendamento } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { AuthzError } from "@/lib/authz";
import { requireMunicipeFromToken } from "@/lib/auth-municipe";
import { INCLUDE_AGENDAMENTO } from "@/lib/agendamentos-core";
import { prisma } from "@/lib/prisma";
import { cancelarReuniaoTeamsInterno } from "@/lib/agendamentos-teams";
import { instanteUtcRealDesdeDataHoraApi } from "@/lib/date-time";
import {
	criarAgendamentoPortalProcesso,
	validarNumeroProcessoPortal,
	type DadosCriacaoPortalProcesso,
} from "@/lib/portal-processos-core";

export async function validarProcessoPortal(token: string, numeroProcesso: string) {
	try {
		await requireMunicipeFromToken(token);
		const validacao = await validarNumeroProcessoPortal(numeroProcesso);
		return { ok: true as const, error: null, data: validacao, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false as const,
			error: "Não foi possível consultar o processo.",
			data: null,
			status: 500,
		};
	}
}

export async function criarSolicitacaoPortalProcesso(
	token: string,
	dados: DadosCriacaoPortalProcesso,
) {
	try {
		const municipe = await requireMunicipeFromToken(token);
		const resultado = await criarAgendamentoPortalProcesso({ municipe, dados });
		if (resultado.precisaConfirmacao) {
			return {
				ok: true as const,
				error: null,
				data: { precisaConfirmacao: true as const, validacao: resultado.validacao },
				status: 200,
			};
		}
		revalidateTag("agendamentos", 'max');
		return {
			ok: true as const,
			error: null,
			data: {
				precisaConfirmacao: false as const,
				agendamento: resultado.agendamento,
				validacao: resultado.validacao,
			},
			status: 201,
		};
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false as const,
			error: error instanceof Error ? error.message : "Não foi possível criar o agendamento.",
			data: null,
			status: 400,
		};
	}
}

export async function listarAgendamentosPortalProcesso(token: string) {
	try {
		const municipe = await requireMunicipeFromToken(token);
		const data = await prisma.agendamento.findMany({
			where: { municipeContaId: municipe.id, origemPortalProcesso: true },
			orderBy: { dataHora: "desc" },
			include: INCLUDE_AGENDAMENTO,
		});
		return { ok: true as const, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false as const,
			error: "Não foi possível listar seus agendamentos.",
			data: null,
			status: 500,
		};
	}
}

export async function cancelarAgendamentoPortalProcesso(
	token: string,
	id: string,
	motivo: string,
) {
	try {
		const municipe = await requireMunicipeFromToken(token);
		const ag = await prisma.agendamento.findFirst({
			where: { id, municipeContaId: municipe.id, origemPortalProcesso: true },
			select: {
				id: true,
				status: true,
				dataHora: true,
				teamsEventId: true,
				conferenciaCapStatus: true,
			},
		});
		if (!ag) {
			return { ok: false as const, error: "Agendamento não encontrado.", data: null, status: 404 };
		}
		if (
			ag.status === StatusAgendamento.CANCELADO ||
			ag.status === StatusAgendamento.ATENDIDO ||
			ag.status === StatusAgendamento.NAO_REALIZADO
		) {
			return {
				ok: false as const,
				error: "Este agendamento não pode mais ser cancelado.",
				data: null,
				status: 400,
			};
		}

		const motivoTrim = (motivo || "Cancelado pelo munícipe.").trim();
		const jaConfirmado = ag.status === StatusAgendamento.AGENDADO;
		if (jaConfirmado) {
			const inicioReal = instanteUtcRealDesdeDataHoraApi(ag.dataHora);
			if (inicioReal.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
				return {
					ok: false as const,
					error: "Cancelamentos de agendamentos confirmados devem ser feitos com pelo menos 24 horas de antecedência.",
					data: null,
					status: 400,
				};
			}
		}

		if (ag.teamsEventId) {
			const resultado = await cancelarReuniaoTeamsInterno(ag.id, motivoTrim.length >= 5 ? motivoTrim : `${motivoTrim} (portal)`, null);
			if (!resultado.ok) {
				return { ok: false as const, error: resultado.error ?? "Falha ao cancelar.", data: null, status: 400 };
			}
		} else {
			await prisma.agendamento.update({
				where: { id: ag.id },
				data: {
					status: StatusAgendamento.CANCELADO,
					motivoCancelamento: motivoTrim,
					canceladoEm: new Date(),
					conferenciaCapStatus:
						ag.conferenciaCapStatus === ConferenciaCapStatus.AGUARDANDO
							? ConferenciaCapStatus.AGUARDANDO
							: ag.conferenciaCapStatus,
				},
			});
		}

		const atualizado = await prisma.agendamento.findUnique({
			where: { id: ag.id },
			include: INCLUDE_AGENDAMENTO,
		});
		revalidateTag("agendamentos", 'max');
		return { ok: true as const, error: null, data: atualizado, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false as const,
			error: "Não foi possível cancelar o agendamento.",
			data: null,
			status: 500,
		};
	}
}
