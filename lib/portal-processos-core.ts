import "server-only";

import {
	ConferenciaCapStatus,
	RelacaoInteressado,
	StatusAgendamento,
	type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
	buscarOuCriarTipoPorTexto,
	calcularDataFim,
	INCLUDE_AGENDAMENTO,
	instanteCivilSaoPauloSemDeslocamento,
	padronizarNome,
} from "@/lib/agendamentos-core";
import { consultarProcessoNoBi, type ResultadoBiProcesso } from "@/lib/bi-processos";
import {
	DURACAO_PORTAL_PROCESSO_MINUTOS,
	HORARIOS_PORTAL_PROCESSO,
	RELACOES_INTERESSADO,
	TIPOS_AGENDAMENTO_PORTAL_PROCESSO,
	type RelacaoInteressadoValor,
} from "@/lib/portal-processos-constantes";
import { validaCPF_CNPJ } from "@/lib/utils";

export function whereExcluirConferenciaCapPendente(): Prisma.AgendamentoWhereInput {
	return {
		OR: [{ conferenciaCapStatus: null }, { conferenciaCapStatus: { not: ConferenciaCapStatus.AGUARDANDO } }],
	};
}

export async function garantirTiposAgendamentoPortalProcessos(): Promise<void> {
	for (const tipo of TIPOS_AGENDAMENTO_PORTAL_PROCESSO) {
		await buscarOuCriarTipoPorTexto(tipo.texto);
	}
}

function normalizarUnidade(raw: string): string[] {
	const t = raw.trim().replace(/\s+/g, " ").toUpperCase();
	if (!t) return [];
	const semSmul = t.replace(/^SMUL\//, "");
	const comBarra = semSmul.replace(/-/g, "/");
	const semEspaco = comBarra.replace(/\s+/g, "");
	const primeiro = semEspaco.split("/")[0] ?? "";
	return Array.from(new Set([t, semSmul, comBarra, semEspaco, primeiro].filter(Boolean)));
}

export type UnidadeMapeada = {
	divisaoId: string | null;
	coordenadoriaId: string | null;
	siglaDivisao: string | null;
	siglaCoordenadoria: string | null;
};

export async function mapearUnidadeBi(unidade: string | null | undefined): Promise<UnidadeMapeada> {
	const vazio: UnidadeMapeada = {
		divisaoId: null,
		coordenadoriaId: null,
		siglaDivisao: null,
		siglaCoordenadoria: null,
	};
	if (!unidade?.trim()) return vazio;

	const variantes = normalizarUnidade(unidade);
	const [divisoes, coordenadorias] = await Promise.all([
		prisma.divisao.findMany({
			where: { status: true },
			select: { id: true, sigla: true, coordenadoriaId: true, coordenadoria: { select: { id: true, sigla: true } } },
		}),
		prisma.coordenadoria.findMany({
			where: { status: true },
			select: { id: true, sigla: true },
		}),
	]);

	const porSiglaDivisao = new Map(divisoes.map((d) => [d.sigla.trim().toUpperCase(), d]));
	const porSiglaCoord = new Map(coordenadorias.map((c) => [c.sigla.trim().toUpperCase(), c]));

	for (const v of variantes) {
		const div = porSiglaDivisao.get(v);
		if (div) {
			const coordId = div.coordenadoriaId ?? div.coordenadoria?.id ?? porSiglaCoord.get(v.split("/")[0] ?? "")?.id ?? null;
			return {
				divisaoId: div.id,
				coordenadoriaId: coordId,
				siglaDivisao: div.sigla,
				siglaCoordenadoria: div.coordenadoria?.sigla ?? porSiglaCoord.get(v.split("/")[0] ?? "")?.sigla ?? null,
			};
		}
	}

	for (const v of variantes) {
		const coord = porSiglaCoord.get(v);
		if (coord) {
			return {
				divisaoId: null,
				coordenadoriaId: coord.id,
				siglaDivisao: null,
				siglaCoordenadoria: coord.sigla,
			};
		}
	}

	return vazio;
}

export type ValidacaoProcessoPortal = ResultadoBiProcesso & UnidadeMapeada;

export async function validarNumeroProcessoPortal(numero: string): Promise<ValidacaoProcessoPortal> {
	const bi = await consultarProcessoNoBi(numero);
	if (!bi.unidade) {
		return { ...bi, divisaoId: null, coordenadoriaId: null, siglaDivisao: null, siglaCoordenadoria: null };
	}
	const mapa = await mapearUnidadeBi(bi.unidade);
	return { ...bi, ...mapa };
}

export type DadosCriacaoPortalProcesso = {
	cpf: string;
	telefone: string;
	processo: string;
	tipoAgendamentoTexto: string;
	relacaoInteressado: RelacaoInteressadoValor;
	data: string;
	hora: string;
	confirmadoProcessoAusente?: boolean;
};

function parseDataHoraCivil(data: string, hora: string): Date {
	const [ano, mes, dia] = data.split("-").map(Number);
	const [hh, mm] = hora.split(":").map(Number);
	if (!ano || !mes || !dia || hh == null || mm == null) {
		throw new Error("Data ou horário inválidos.");
	}
	const dataObj = new Date(ano, mes - 1, dia);
	if (dataObj.getDay() === 0 || dataObj.getDay() === 6) {
		throw new Error("Selecione um dia útil (segunda a sexta).");
	}
	if (!HORARIOS_PORTAL_PROCESSO.includes(hora as (typeof HORARIOS_PORTAL_PROCESSO)[number])) {
		throw new Error("Horário indisponível.");
	}
	const agoraParts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(new Date());
	const num = (t: Intl.DateTimeFormatPartTypes) =>
		Number(agoraParts.find((p) => p.type === t)?.value);
	const selecionadoMin = hh * 60 + mm;
	const agoraMin = num("hour") * 60 + num("minute");
	const mesmoDia = ano === num("year") && mes === num("month") && dia === num("day");
	if (mesmoDia && selecionadoMin <= agoraMin) {
		throw new Error("Selecione uma data e horário futuros.");
	}
	if (!mesmoDia) {
		const hoje = new Date(num("year"), num("month") - 1, num("day"));
		const escolhido = new Date(ano, mes - 1, dia);
		if (escolhido < hoje) throw new Error("Selecione uma data e horário futuros.");
	}
	return instanteCivilSaoPauloSemDeslocamento(ano, mes - 1, dia, hh, mm, 0);
}

export async function criarAgendamentoPortalProcesso(params: {
	municipe: { id: string; nome: string; email: string };
	dados: DadosCriacaoPortalProcesso;
}) {
	const cpfDigitos = params.dados.cpf.replace(/\D/g, "");
	if (!validaCPF_CNPJ(cpfDigitos)) {
		throw new Error("CPF inválido.");
	}
	const telefoneDigitos = params.dados.telefone.replace(/\D/g, "");
	if (telefoneDigitos.length < 10) {
		throw new Error("Informe um telefone de contato válido.");
	}
	const processo = params.dados.processo.trim();
	if (!processo) throw new Error("Informe o número do processo.");

	if (!RELACOES_INTERESSADO.some((r) => r.valor === params.dados.relacaoInteressado)) {
		throw new Error("Relação com o projeto inválida.");
	}
	if (!TIPOS_AGENDAMENTO_PORTAL_PROCESSO.some((t) => t.texto === params.dados.tipoAgendamentoTexto)) {
		throw new Error("Tipo de agendamento inválido.");
	}

	const dataHora = parseDataHoraCivil(params.dados.data, params.dados.hora);
	const dataFim = calcularDataFim(dataHora, DURACAO_PORTAL_PROCESSO_MINUTOS);

	const validacao = await validarNumeroProcessoPortal(processo);
	const naoLocalizadoParaFluxoAuto = !validacao.elegivelAutomatico;
	if (naoLocalizadoParaFluxoAuto && !params.dados.confirmadoProcessoAusente) {
		return { precisaConfirmacao: true as const, validacao };
	}
	const precisaConferencia = naoLocalizadoParaFluxoAuto || !validacao.coordenadoriaId;

	const duplicado = await prisma.agendamento.findFirst({
		where: {
			municipeContaId: params.municipe.id,
			processo,
			status: { notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.NAO_REALIZADO] },
			dataHora,
		},
		select: { id: true },
	});
	if (duplicado) {
		throw new Error("Já existe um agendamento seu para este processo neste horário.");
	}

	await garantirTiposAgendamentoPortalProcessos();
	const tipoAgendamentoId = await buscarOuCriarTipoPorTexto(params.dados.tipoAgendamentoTexto);

	const conferenciaCapStatus = precisaConferencia ? ConferenciaCapStatus.AGUARDANDO : null;

	const agendamento = await prisma.agendamento.create({
		data: {
			municipe: padronizarNome(params.municipe.nome),
			cpf: cpfDigitos,
			processo: validacao.processo || processo,
			email: params.municipe.email,
			telefone: telefoneDigitos,
			relacaoInteressado: params.dados.relacaoInteressado as RelacaoInteressado,
			origemPortalProcesso: true,
			conferenciaCapStatus,
			unidadeDespachoBi: validacao.unidade,
			encontradoNoBi: validacao.encontrado,
			biComuniqueSe: validacao.comuniqueSeAberto,
			biIndeferido: validacao.indeferido,
			confirmadoProcessoAusente: naoLocalizadoParaFluxoAuto,
			municipeContaId: params.municipe.id,
			tipoAgendamentoId,
			coordenadoriaId: precisaConferencia ? null : validacao.coordenadoriaId,
			divisaoId: precisaConferencia ? null : validacao.divisaoId,
			status: StatusAgendamento.SOLICITADO,
			dataHora,
			dataFim,
			resumo: precisaConferencia
				? "Solicitação do portal enviada para conferência da CAP (processo não localizado ou unidade não mapeada na base BI)."
				: `Solicitação do portal. Unidade BI: ${validacao.unidade ?? "—"}.`,
		},
		include: INCLUDE_AGENDAMENTO,
	});

	return { precisaConfirmacao: false as const, agendamento, validacao };
}
