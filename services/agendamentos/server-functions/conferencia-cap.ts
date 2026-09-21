/** @format */

"use server";

import { ConferenciaCapStatus, StatusAgendamento } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { AuthzError, requireUsuario, verificarPermissoes } from "@/lib/authz";
import { INCLUDE_AGENDAMENTO } from "@/lib/agendamentos-core";
import { usuarioPodeAcessarConferenciaCap } from "@/lib/conferencia-cap-acesso";
import { prisma } from "@/lib/prisma";

async function requireCap() {
	const usuario = await requireUsuario();
	verificarPermissoes(usuario, ["ADM", "DEV", "PONTO_FOCAL", "COORDENADOR"]);
	if (!usuarioPodeAcessarConferenciaCap(usuario)) {
		throw new AuthzError("Você não tem permissão para a conferência da CAP.", 403);
	}
	return usuario;
}

export async function listarConferenciaCap() {
	try {
		await requireCap();
		const data = await prisma.agendamento.findMany({
			where: {
				origemPortalProcesso: true,
				conferenciaCapStatus: ConferenciaCapStatus.AGUARDANDO,
				status: StatusAgendamento.SOLICITADO,
			},
			orderBy: { criadoEm: "asc" },
			include: INCLUDE_AGENDAMENTO,
		});
		return { ok: true as const, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return { ok: false as const, error: "Não foi possível listar a fila da CAP.", data: null, status: 500 };
	}
}

export async function encaminharConferenciaCap(
	id: string,
	dados: { coordenadoriaId: string; divisaoId?: string | null; processo?: string | null },
) {
	try {
		await requireCap();
		const ag = await prisma.agendamento.findUnique({
			where: { id },
			select: { id: true, conferenciaCapStatus: true, origemPortalProcesso: true, status: true },
		});
		if (!ag || !ag.origemPortalProcesso) {
			return { ok: false as const, error: "Solicitação não encontrada.", data: null, status: 404 };
		}
		if (ag.conferenciaCapStatus !== ConferenciaCapStatus.AGUARDANDO) {
			return { ok: false as const, error: "Esta solicitação já foi analisada.", data: null, status: 400 };
		}

		const coordenadoria = await prisma.coordenadoria.findFirst({
			where: { id: dados.coordenadoriaId, status: true },
			select: { id: true, sigla: true },
		});
		if (!coordenadoria) {
			return { ok: false as const, error: "Coordenadoria inválida.", data: null, status: 400 };
		}

		let divisaoId: string | null = dados.divisaoId?.trim() || null;
		if (divisaoId) {
			const divisao = await prisma.divisao.findFirst({
				where: { id: divisaoId, status: true, coordenadoriaId: coordenadoria.id },
				select: { id: true },
			});
			if (!divisao) {
				return { ok: false as const, error: "Divisão inválida para a coordenadoria selecionada.", data: null, status: 400 };
			}
		}

		const processo = dados.processo?.trim();
		const atualizado = await prisma.agendamento.update({
			where: { id },
			data: {
				coordenadoriaId: coordenadoria.id,
				divisaoId,
				conferenciaCapStatus: ConferenciaCapStatus.ENCAMINHADO,
				...(processo ? { processo } : {}),
				resumo: `Encaminhado pela CAP à coordenadoria ${coordenadoria.sigla}.`,
			},
			include: INCLUDE_AGENDAMENTO,
		});
		revalidateTag("agendamentos", 'max');
		return { ok: true as const, error: null, data: atualizado, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return { ok: false as const, error: "Não foi possível encaminhar a solicitação.", data: null, status: 500 };
	}
}

export async function recusarConferenciaCap(id: string, observacao: string) {
	try {
		await requireCap();
		const texto = observacao.trim();
		if (texto.length < 5) {
			return {
				ok: false as const,
				error: "Informe o motivo (mínimo 5 caracteres) para o munícipe.",
				data: null,
				status: 400,
			};
		}
		const ag = await prisma.agendamento.findUnique({
			where: { id },
			select: { id: true, conferenciaCapStatus: true, origemPortalProcesso: true },
		});
		if (!ag || !ag.origemPortalProcesso) {
			return { ok: false as const, error: "Solicitação não encontrada.", data: null, status: 404 };
		}
		if (ag.conferenciaCapStatus !== ConferenciaCapStatus.AGUARDANDO) {
			return { ok: false as const, error: "Esta solicitação já foi analisada.", data: null, status: 400 };
		}

		const atualizado = await prisma.agendamento.update({
			where: { id },
			data: {
				status: StatusAgendamento.CANCELADO,
				conferenciaCapStatus: ConferenciaCapStatus.NAO_ENCONTRADO,
				observacaoCap: texto,
				motivoCancelamento: texto,
				canceladoEm: new Date(),
			},
			include: INCLUDE_AGENDAMENTO,
		});
		revalidateTag("agendamentos", 'max');
		return { ok: true as const, error: null, data: atualizado, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false as const, error: error.message, data: null, status: error.status };
		}
		return { ok: false as const, error: "Não foi possível registrar a resposta.", data: null, status: 500 };
	}
}
