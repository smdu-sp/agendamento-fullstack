import "server-only";

import {
	ConferenciaCapStatus,
	ModalidadeAgendamento,
	OrigemAgendamento,
	RelacaoInteressado,
	StatusAgendamento,
	TipoRecursoAtendimento,
	type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
	buscarOuCriarTipoPorTexto,
	calcularDataFim,
	INCLUDE_AGENDAMENTO,
	instanteCivilSaoPauloSemDeslocamento,
	padronizarNome,
	rfParaLogin,
} from "@/lib/agendamentos-core";
import { bloquearTecnicos, consultarSlotsTecnico, dataCivil, exigirSlotLivre, tecnicoAusenteNoIntervalo } from "@/lib/agenda-tecnicos";
import { consultarProcessoNoBi, type OcorrenciaBi, type ResultadoBiProcesso } from "@/lib/bi-processos";
import {
	DURACAO_PORTAL_PROCESSO_MINUTOS,
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
	ocorrenciaId?: string;
	modalidade?: ModalidadeAgendamento;
	duvidaAtendimento?: string;
	tipoAgendamentoTexto: string;
	relacaoInteressado: RelacaoInteressadoValor;
	data: string;
	hora: string;
	confirmadoProcessoAusente?: boolean;
};

function parseDataHoraCivil(data: string, hora: string, horarioDaAgenda = false): Date {
	const [ano, mes, dia] = data.split("-").map(Number);
	const [hh, mm] = hora.split(":").map(Number);
	if (!ano || !mes || !dia || hh == null || mm == null) {
		throw new Error("Data ou horário inválidos.");
	}
	const dataObj = new Date(ano, mes - 1, dia);
	if (dataObj.getDay() === 0 || dataObj.getDay() === 6) {
		throw new Error("Selecione um dia útil (segunda a sexta).");
	}
	if ((!horarioDaAgenda && !(/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) && hh * 60 + mm >= 9 * 60 && hh * 60 + mm <= 16 * 60 && mm % 30 === 0)) ||
		(horarioDaAgenda && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))) {
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

export async function tecnicoDaOcorrencia(rf: string | null | undefined): Promise<string | null> {
	const login = rf ? rfParaLogin(rf) : null;
	if (!login) return null;
	const tecnico = await prisma.usuario.findUnique({ where: { login }, select: { id: true, status: true, permissao: true, divisaoId: true } });
	return tecnico?.status && (tecnico.permissao === 'TEC' || (tecnico.permissao === 'DEV' && tecnico.divisaoId)) ? tecnico.id : null;
}

export async function disponibilidadeProcessoPortal(processo: string, ocorrenciaId: string, data: string, modalidade: ModalidadeAgendamento) {
	if (!Object.values(ModalidadeAgendamento).includes(modalidade)) throw new Error('Modalidade inválida.');
	const bi = await consultarProcessoNoBi(processo);
	if (bi.erroBi) throw new Error('Não foi possível consultar o BI. Tente novamente mais tarde.');
	const ocorrencia = bi.ocorrencias.find((item) => item.id === ocorrenciaId && item.elegivel);
	if (!ocorrencia) throw new Error('A ocorrência selecionada não está disponível. Pesquise novamente.');
	const tecnicoId = await tecnicoDaOcorrencia(ocorrencia.responsavelRF);
	if (!tecnicoId) return { tipo: 'PREFERENCIA' as const, horarios: [] as string[] };
	const regras = await prisma.agendaTecnico.count({ where: { tecnicoId, ativo: true, modalidade } });
	if (!regras) return { tipo: 'PREFERENCIA' as const, horarios: [] as string[] };
	const slots = await consultarSlotsTecnico(prisma, tecnicoId, dataCivil(data), modalidade, undefined, true);
	const compatíveis = slots.filter((s) => s.fim.getTime() - s.inicio.getTime() === DURACAO_PORTAL_PROCESSO_MINUTOS * 60_000);
	const ausencias = await prisma.ausenciaTecnico.findMany({ where: {
		tecnicoId, ativo: true, dataHoraInicio: { lt: new Date(dataCivil(data).getTime() + 86_400_000) },
		dataHoraFim: { gt: dataCivil(data) },
	}, select: { dataHoraInicio: true, dataHoraFim: true } });
	const horariosReserva = compatíveis.filter((s) => ausencias.some((a) => a.dataHoraInicio < s.fim && s.inicio < a.dataHoraFim)).map((s) => s.inicio.toISOString().slice(11, 16));
	return { tipo: 'AGENDA' as const, horarios: compatíveis.map((s) => s.inicio.toISOString().slice(11, 16)), horariosReserva };
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

	const atendimentoRecurso = params.dados.tipoAgendamentoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto;
	const modalidade = params.dados.modalidade;
	const duvidaAtendimento = params.dados.duvidaAtendimento?.trim();
	if (atendimentoRecurso) {
		if (!modalidade || !Object.values(ModalidadeAgendamento).includes(modalidade)) {
			throw new Error("Selecione a modalidade do atendimento.");
		}
		if (!duvidaAtendimento || duvidaAtendimento.length < 10) {
			throw new Error("Descreva a dúvida do atendimento (mínimo de 10 caracteres).");
		}
		if (duvidaAtendimento.length > 5000) {
			throw new Error("A dúvida deve ter no máximo 5000 caracteres.");
		}
	}
	const resultadoBi = await consultarProcessoNoBi(processo);
	if (resultadoBi.erroBi) throw new Error("Não foi possível consultar o BI. Tente novamente mais tarde.");
	let ocorrencia: OcorrenciaBi | undefined;
	if (atendimentoRecurso && resultadoBi.encontrado) {
		if (!params.dados.ocorrenciaId) throw new Error("Selecione uma ocorrência do processo.");
		ocorrencia = resultadoBi.ocorrencias.find((item) => item.id === params.dados.ocorrenciaId);
		if (!ocorrencia) throw new Error("A ocorrência selecionada mudou no BI. Pesquise novamente.");
		if (!ocorrencia.elegivel) throw new Error("Esta ocorrência não permite solicitar atendimento.");
	} else if (atendimentoRecurso && params.dados.ocorrenciaId) {
		throw new Error("A ocorrência selecionada não foi encontrada no BI. Pesquise novamente.");
	}
	const tecnicoId = atendimentoRecurso ? await tecnicoDaOcorrencia(ocorrencia?.responsavelRF) : null;
	const temAgenda = !!tecnicoId && !!modalidade && (await prisma.agendaTecnico.count({ where: { tecnicoId, ativo: true, modalidade } })) > 0;
	const dataHora = parseDataHoraCivil(params.dados.data, params.dados.hora, temAgenda);
	const dataFim = calcularDataFim(dataHora, DURACAO_PORTAL_PROCESSO_MINUTOS);
	const unidadeSelecionada = atendimentoRecurso ? ocorrencia?.unidade : resultadoBi.unidade;
	const mapa = await mapearUnidadeBi(unidadeSelecionada);
	const validacao: ValidacaoProcessoPortal = {
		...resultadoBi,
		...mapa,
		processo: atendimentoRecurso ? ocorrencia?.processo ?? null : resultadoBi.processo,
		protocolo: atendimentoRecurso ? ocorrencia?.protocolo ?? null : resultadoBi.protocolo,
		unidade: unidadeSelecionada ?? null,
		comuniqueSeAberto: atendimentoRecurso ? ocorrencia?.tipo === "COMUNIQUE_SE" : resultadoBi.comuniqueSeAberto,
		indeferido: atendimentoRecurso ? ocorrencia?.tipo === "DESPACHO" : resultadoBi.indeferido,
		elegivelAutomatico: atendimentoRecurso ? !!ocorrencia : resultadoBi.elegivelAutomatico,
	};
	const naoLocalizadoParaFluxoAuto = atendimentoRecurso ? !resultadoBi.encontrado : !resultadoBi.elegivelAutomatico;
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

	const dadosAgendamento: Prisma.AgendamentoUncheckedCreateInput = {
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
			modalidade: atendimentoRecurso ? modalidade : null,
			origemAgendamento: atendimentoRecurso ? OrigemAgendamento.RECURSO : null,
			tipoRecurso: ocorrencia?.tipo === "COMUNIQUE_SE"
				? TipoRecursoAtendimento.COMUNIQUE_SE
				: ocorrencia?.tipo === "DESPACHO" ? TipoRecursoAtendimento.DESPACHO : null,
			ocorrenciaBiId: ocorrencia?.id ?? null,
			protocoloOrigem: ocorrencia?.protocolo ?? null,
			sistemaOrigem: ocorrencia?.sistema ?? null,
			situacaoRecurso: ocorrencia?.situacao ?? null,
			unidadeOrigem: ocorrencia?.unidade ?? null,
			responsavelOriginal: ocorrencia?.responsavel ?? null,
			responsavelOriginalRF: ocorrencia?.responsavelRF ?? null,
			snapshotBiEm: ocorrencia ? new Date() : null,
			duvidaAtendimento: atendimentoRecurso ? duvidaAtendimento : null,
			municipeContaId: params.municipe.id,
			tipoAgendamentoId,
			coordenadoriaId: precisaConferencia ? null : validacao.coordenadoriaId,
			divisaoId: precisaConferencia ? null : validacao.divisaoId,
			status: StatusAgendamento.SOLICITADO,
			dataHora,
			dataFim,
			tecnicoId: temAgenda && !precisaConferencia ? tecnicoId : null,
			resumo: precisaConferencia
				? "Solicitação do portal enviada para conferência da CAP (processo não localizado ou unidade não mapeada na base BI)."
				: `Solicitação do portal. Unidade BI: ${validacao.unidade ?? "—"}.`,
	};
	const agendamento = temAgenda && !precisaConferencia && tecnicoId && modalidade
		? await prisma.$transaction(async (tx) => {
			await bloquearTecnicos(tx, [tecnicoId]);
			await exigirSlotLivre(tx, tecnicoId, dataHora, dataFim, modalidade, undefined, true);
			const ausencia = await tecnicoAusenteNoIntervalo(tx, tecnicoId, dataHora, dataFim);
			if (ausencia) {
				dadosAgendamento.tecnicoId = null;
				dadosAgendamento.encaminhadoReservaEm = new Date();
				dadosAgendamento.motivoEncaminhamentoReserva = `Ausência do responsável original: ${ausencia.tipo}`.slice(0, 255);
			}
			const criado = await tx.agendamento.create({ data: dadosAgendamento, include: INCLUDE_AGENDAMENTO });
			await tx.eventoAgendamento.create({ data: {
				agendamentoId: criado.id, tipo: 'CRIADO', dados: { origem: 'PORTAL', status: StatusAgendamento.SOLICITADO },
			} });
			if (ausencia) {
				await tx.eventoAgendamento.create({ data: {
					agendamentoId: criado.id, tipo: 'ENCAMINHADO_RESERVA',
					dados: { tecnicoOriginalId: tecnicoId, responsavelOriginalRF: ocorrencia?.responsavelRF ?? null, ausenciaId: ausencia.id, horarioPretendido: dataHora.toISOString() },
				} });
			}
			return criado;
		})
		: await prisma.$transaction(async (tx) => {
			const criado = await tx.agendamento.create({ data: dadosAgendamento, include: INCLUDE_AGENDAMENTO });
			await tx.eventoAgendamento.create({ data: {
				agendamentoId: criado.id, tipo: 'CRIADO', dados: { origem: 'PORTAL', status: StatusAgendamento.SOLICITADO },
			} });
			return criado;
		});

	return { precisaConfirmacao: false as const, agendamento, validacao };
}
