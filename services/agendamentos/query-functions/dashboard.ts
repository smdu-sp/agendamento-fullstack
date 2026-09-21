/** @format */

'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError, type UsuarioAutenticado } from '@/lib/authz';
import {
	escopoListaAgendamentosParaTec,
	coordenadoriaIdDoUsuarioLogado,
	divisaoPreProjetosEnv,
	whereExcluirPreProjetoArthurNaListaAgendamentos,
} from '@/lib/agendamentos-core';
import { whereExcluirConferenciaCapPendente } from '@/lib/portal-processos-core';
import {
	IDashboard,
	IDashboardPorMes,
	IDashboardPorAno,
	IDashboardPorDia,
	IDashboardPorSemana,
	IDashboardMotivoNaoRealizacao,
	IRespostaDashboard,
	TipoPeriodoDashboard,
} from '@/types/dashboard';

export async function getDashboard(opts?: {
	tipoPeriodo?: TipoPeriodoDashboard;
	ano?: number;
	mes?: number;
	semanaInicio?: string;
	dataInicio?: string;
	dataFim?: string;
	coordenadoriaId?: string;
	divisaoId?: string;
}): Promise<IRespostaDashboard> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR', 'DIRETOR']);

		const periodo =
			opts?.tipoPeriodo === 'semana' || opts?.tipoPeriodo === 'mes' || opts?.tipoPeriodo === 'ano'
				? opts.tipoPeriodo
				: 'ano';
		const data = await calcularDashboard(
			usuario,
			periodo,
			opts?.ano,
			opts?.mes,
			opts?.semanaInicio,
			opts?.dataInicio,
			opts?.dataFim,
			opts?.coordenadoriaId,
			opts?.divisaoId,
		);
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Não foi possível carregar o dashboard.',
			data: null,
			status: 400,
		};
	}
}

async function calcularDashboard(
	usuarioLogado: UsuarioAutenticado,
	tipoPeriodo: TipoPeriodoDashboard,
	ano?: number,
	mes?: number,
	semanaInicio?: string,
	dataInicioQuery?: string,
	dataFimQuery?: string,
	coordenadoriaId?: string,
	divisaoId?: string,
): Promise<IDashboard> {
	const anoFiltro = ano ?? new Date().getFullYear();
	let filtroCoordenadoria: string | undefined;
	let filtroDivisaoTecnico: string | undefined;
	let filtroPFCoordDashboard: string | undefined;
	let filtroTecnicoDashboard: { tecnicoId: string } | undefined;
	let dashboardDevTecSemDivisao = false;

	if (usuarioLogado.permissao === 'PONTO_FOCAL') {
		filtroDivisaoTecnico = usuarioLogado.divisaoId ?? undefined;
		filtroPFCoordDashboard = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
	} else if (usuarioLogado.permissao === 'COORDENADOR') {
		filtroCoordenadoria = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
		if (divisaoId) filtroDivisaoTecnico = divisaoId;
	} else if (usuarioLogado.permissao === 'DIRETOR') {
		filtroDivisaoTecnico = usuarioLogado.divisaoId ?? undefined;
	} else if (usuarioLogado.permissao === 'TEC') {
		const esc = escopoListaAgendamentosParaTec(usuarioLogado);
		if (esc.modo === 'dev_impersona_tec_sem_divisao') {
			dashboardDevTecSemDivisao = true;
		} else if (esc.modo === 'dev_impersona_tec') {
			filtroDivisaoTecnico = esc.divisaoId;
		} else if (esc.modo === 'arthur') {
			filtroDivisaoTecnico = esc.divisaoArthurId;
		} else {
			filtroTecnicoDashboard = { tecnicoId: esc.usuarioId };
		}
	} else if (usuarioLogado.permissao === 'DEV') {
		const coordIdDev = await coordenadoriaIdDoUsuarioLogado(usuarioLogado);
		if (coordIdDev) filtroCoordenadoria = coordIdDev;
		else if (divisaoId) filtroDivisaoTecnico = divisaoId;
		else if (coordenadoriaId) filtroCoordenadoria = coordenadoriaId;
	} else if (divisaoId) {
		filtroDivisaoTecnico = divisaoId;
	} else if (coordenadoriaId) {
		filtroCoordenadoria = coordenadoriaId;
	}

	let dataInicio: Date;
	let dataFim: Date;

	if (dataInicioQuery?.trim() && dataFimQuery?.trim()) {
		const dIni = new Date(dataInicioQuery.trim());
		const dFim = new Date(dataFimQuery.trim());
		if (!Number.isNaN(dIni.getTime()) && !Number.isNaN(dFim.getTime())) {
			dataInicio = dIni;
			dataFim = dFim;
		} else {
			dataInicio = new Date(anoFiltro, 0, 1, 0, 0, 0, 0);
			dataFim = new Date(anoFiltro, 11, 31, 23, 59, 59, 999);
		}
	} else if (tipoPeriodo === 'semana') {
		if (semanaInicio?.trim()) {
			const parts = semanaInicio.trim().split('-').map(Number);
			if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
				dataInicio = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
			} else {
				const d = new Date();
				const day = d.getDay();
				const diff = d.getDate() - day + (day === 0 ? -6 : 1);
				dataInicio = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
			}
		} else {
			const d = new Date();
			const day = d.getDay();
			const diff = d.getDate() - day + (day === 0 ? -6 : 1);
			dataInicio = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
		}
		dataFim = new Date(dataInicio);
		dataFim.setDate(dataFim.getDate() + 6);
		dataFim.setHours(23, 59, 59, 999);
	} else if (tipoPeriodo === 'mes' && mes != null && mes >= 1 && mes <= 12) {
		dataInicio = new Date(anoFiltro, mes - 1, 1, 0, 0, 0, 0);
		const ultimoDia = new Date(anoFiltro, mes, 0).getDate();
		dataFim = new Date(anoFiltro, mes - 1, ultimoDia, 23, 59, 59, 999);
	} else {
		dataInicio = new Date(anoFiltro, 0, 1, 0, 0, 0, 0);
		dataFim = new Date(anoFiltro, 11, 31, 23, 59, 59, 999);
	}

	const anoMin = new Date().getFullYear() - 5;

	let filtroPorTecnicoDivisao: Prisma.AgendamentoWhereInput;
	if (dashboardDevTecSemDivisao) {
		filtroPorTecnicoDivisao = {
			AND: [
				{ id: '00000000-0000-0000-0000-000000000000' },
				{ id: { not: '00000000-0000-0000-0000-000000000000' } },
			],
		};
	} else if (filtroTecnicoDashboard) {
		filtroPorTecnicoDivisao = { ...filtroTecnicoDashboard };
	} else if (
		usuarioLogado.permissao === 'PONTO_FOCAL' &&
		filtroDivisaoTecnico &&
		filtroPFCoordDashboard
	) {
		const envDivPre = divisaoPreProjetosEnv();
		const orDash: Prisma.AgendamentoWhereInput[] = [
			{ tecnico: { divisaoId: filtroDivisaoTecnico } },
			{ divisaoId: filtroDivisaoTecnico },
			{ coordenadoriaId: filtroPFCoordDashboard, tecnicoId: null },
		];
		if (envDivPre) orDash.push({ coordenadoriaId: filtroPFCoordDashboard, divisaoId: envDivPre });
		filtroPorTecnicoDivisao = { OR: orDash };
	} else {
		const porCoord = filtroCoordenadoria ? { coordenadoriaId: filtroCoordenadoria } : {};
		if (filtroDivisaoTecnico) {
			filtroPorTecnicoDivisao = {
				...porCoord,
				OR: [{ tecnico: { divisaoId: filtroDivisaoTecnico } }, { divisaoId: filtroDivisaoTecnico }],
			};
		} else {
			filtroPorTecnicoDivisao = { ...porCoord };
		}
	}

	const whereBase = {
		AND: [
			{ dataHora: { gte: dataInicio, lte: dataFim }, ...filtroPorTecnicoDivisao },
			whereExcluirPreProjetoArthurNaListaAgendamentos(),
			whereExcluirConferenciaCapPendente(),
		],
	};
	const whereAnoHistorico = {
		AND: [
			{ dataHora: { gte: new Date(anoMin, 0, 1), lte: new Date() }, ...filtroPorTecnicoDivisao },
			whereExcluirPreProjetoArthurNaListaAgendamentos(),
			whereExcluirConferenciaCapPendente(),
		],
	};

	const [totalGeral, realizados, naoRealizados, apenasNaoRealizado, registrosPorMes, registrosPorAno, registrosMotivos] =
		await Promise.all([
			prisma.agendamento.count({ where: whereBase }),
			prisma.agendamento.count({ where: { ...whereBase, status: { in: ['ATENDIDO', 'CONCLUIDO'] } } }),
			prisma.agendamento.count({ where: { ...whereBase, status: { in: ['NAO_REALIZADO', 'CANCELADO'] } } }),
			prisma.agendamento.count({ where: { ...whereBase, status: 'NAO_REALIZADO' } }),
			prisma.agendamento.findMany({ where: whereBase, select: { dataHora: true } }),
			prisma.agendamento.findMany({ where: whereAnoHistorico, select: { dataHora: true } }),
			prisma.agendamento.findMany({
				where: { ...whereBase, status: 'NAO_REALIZADO' },
				select: {
					motivoNaoAtendimentoId: true,
					motivoNaoAtendimento: { select: { id: true, texto: true } },
				},
			}),
		]);

	const datasUnicas = new Set<string>();
	for (const r of registrosPorMes) {
		const d = new Date(r.dataHora);
		datasUnicas.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
	}
	const diasComAgendamentos = datasUnicas.size;

	let porMes: IDashboardPorMes[] = [];
	let porDia: IDashboardPorDia[] | undefined;
	let porSemana: IDashboardPorSemana[] | undefined;

	const getISOWeek = (date: Date): number => {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() + 4 - (d.getDay() || 7));
		const yearStart = new Date(d.getFullYear(), 0, 1);
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	};

	if (tipoPeriodo === 'ano') {
		const porMesMap = new Map<number, number>();
		for (let m = 1; m <= 12; m++) porMesMap.set(m, 0);
		for (const r of registrosPorMes) {
			const d = new Date(r.dataHora);
			porMesMap.set(d.getMonth() + 1, (porMesMap.get(d.getMonth() + 1) ?? 0) + 1);
		}
		porMes = Array.from(porMesMap.entries()).map(([mesN, total]) => ({ mes: mesN, ano: anoFiltro, total }));
		const porSemanaMap = new Map<number, number>();
		for (const r of registrosPorMes) {
			const w = getISOWeek(new Date(r.dataHora));
			porSemanaMap.set(w, (porSemanaMap.get(w) ?? 0) + 1);
		}
		porSemana = Array.from(porSemanaMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([semana, total]) => ({ semana, label: `S${semana}`, total }));
	} else if (tipoPeriodo === 'semana') {
		const labelsDia = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
		const porDiaMap = new Map<number, number>();
		for (let i = 1; i <= 7; i++) porDiaMap.set(i, 0);
		for (const r of registrosPorMes) {
			const diaSemana = new Date(r.dataHora).getDay();
			const segAdom = diaSemana === 0 ? 7 : diaSemana;
			porDiaMap.set(segAdom, (porDiaMap.get(segAdom) ?? 0) + 1);
		}
		porDia = Array.from(porDiaMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([dia, total]) => ({ dia, label: labelsDia[dia - 1], total }));
	} else if (tipoPeriodo === 'mes' && mes != null) {
		const ultimoDia = new Date(anoFiltro, mes, 0).getDate();
		const porDiaMap = new Map<number, number>();
		for (let i = 1; i <= ultimoDia; i++) porDiaMap.set(i, 0);
		for (const r of registrosPorMes) {
			const dia = new Date(r.dataHora).getDate();
			porDiaMap.set(dia, (porDiaMap.get(dia) ?? 0) + 1);
		}
		porDia = Array.from(porDiaMap.entries()).map(([dia, total]) => ({ dia, label: String(dia), total }));
		const numSemanasNoMes = Math.ceil(ultimoDia / 7);
		const porSemanaMap = new Map<number, number>();
		for (let i = 1; i <= numSemanasNoMes; i++) porSemanaMap.set(i, 0);
		for (const r of registrosPorMes) {
			const dia = new Date(r.dataHora).getDate();
			const semanaNoMes = Math.ceil(dia / 7);
			porSemanaMap.set(semanaNoMes, (porSemanaMap.get(semanaNoMes) ?? 0) + 1);
		}
		porSemana = Array.from(porSemanaMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([semana, total]) => ({ semana, label: `Sem ${semana}`, total }));
	}

	const porAnoMap = new Map<number, number>();
	for (const r of registrosPorAno) {
		const y = new Date(r.dataHora).getFullYear();
		if (y >= anoMin) porAnoMap.set(y, (porAnoMap.get(y) ?? 0) + 1);
	}
	const porAno: IDashboardPorAno[] = Array.from(porAnoMap.entries())
		.map(([a, total]) => ({ ano: a, total }))
		.sort((a, b) => a.ano - b.ano);

	const motivosMap = new Map<string, { texto: string; total: number }>();
	for (const r of registrosMotivos) {
		const id = r.motivoNaoAtendimentoId ?? 'sem_motivo';
		const texto = r.motivoNaoAtendimento?.texto ?? 'Não informado';
		if (!motivosMap.has(id)) motivosMap.set(id, { texto, total: 0 });
		motivosMap.get(id)!.total += 1;
	}
	const motivosNaoRealizacao: IDashboardMotivoNaoRealizacao[] = Array.from(motivosMap.entries()).map(
		([motivoId, v]) => ({
			motivoId: motivoId === 'sem_motivo' ? null : motivoId,
			motivoTexto: v.texto,
			total: v.total,
		}),
	);

	return {
		totalGeral,
		realizados,
		naoRealizados,
		apenasNaoRealizado,
		diasComAgendamentos,
		porMes,
		porAno,
		...(porDia != null && { porDia }),
		...(porSemana != null && { porSemana }),
		motivosNaoRealizacao,
	};
}
