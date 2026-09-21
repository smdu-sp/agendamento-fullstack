/** @format */

'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { instanteCivilSaoPaulo } from '@/lib/sao-paulo-datetime';
import {
	INCLUDE_AGENDAMENTO,
	escopoListaAgendamentosParaTec,
	coordenadoriaIdDoUsuarioLogado,
	divisaoPreProjetosEnv,
	whereExcluirPreProjetoArthurNaListaAgendamentos,
} from '@/lib/agendamentos-core';
import { whereExcluirConferenciaCapPendente } from '@/lib/portal-processos-core';
import { IAgendamento, IRespostaAgendamento } from '@/types/agendamento';

export async function buscarDoDia(): Promise<IRespostaAgendamento> {
	try {
		const usuarioLogado = await requireUsuario();
		verificarPermissoes(usuarioLogado, ['ADM', 'DEV', 'TEC', 'PONTO_FOCAL', 'COORDENADOR', 'PORTARIA', 'DIRETOR']);

		const agora = new Date();
		const spParts = new Intl.DateTimeFormat('pt-BR', {
			timeZone: 'America/Sao_Paulo',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(agora);
		const spAno = Number(spParts.find((p) => p.type === 'year')!.value);
		const spMes = Number(spParts.find((p) => p.type === 'month')!.value) - 1;
		const spDia = Number(spParts.find((p) => p.type === 'day')!.value);
		const hoje = instanteCivilSaoPaulo(spAno, spMes, spDia, 0, 0, 0);
		const amanha = instanteCivilSaoPaulo(spAno, spMes, spDia + 1, 0, 0, 0);

		let filtroCoordenadoria: string | undefined;
		let filtroTecnico: string | undefined;
		let filtroDivisaoTecnicoDia: string | undefined;
		let filtroPFCoordDia: string | undefined;
		let escopoTecDia: ReturnType<typeof escopoListaAgendamentosParaTec> | undefined;

		if (usuarioLogado.permissao === 'PONTO_FOCAL') {
			const divisaoIdLogado = usuarioLogado.divisaoId ?? undefined;
			if (divisaoIdLogado) filtroDivisaoTecnicoDia = divisaoIdLogado;
			filtroPFCoordDia = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
		} else if (usuarioLogado.permissao === 'COORDENADOR') {
			filtroCoordenadoria = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
		} else if (usuarioLogado.permissao === 'DIRETOR') {
			const divisaoIdLogado = usuarioLogado.divisaoId ?? undefined;
			if (divisaoIdLogado) filtroDivisaoTecnicoDia = divisaoIdLogado;
		} else if (usuarioLogado.permissao === 'TEC') {
			const escTecDia = escopoListaAgendamentosParaTec(usuarioLogado);
			if (escTecDia.modo === 'dev_impersona_tec_sem_divisao') {
				return { ok: true, error: null, data: [], status: 200 };
			}
			if (escTecDia.modo === 'dev_impersona_tec') {
				filtroDivisaoTecnicoDia = escTecDia.divisaoId;
			} else {
				escopoTecDia = escTecDia;
				if (escTecDia.modo === 'proprio') filtroTecnico = escTecDia.usuarioId;
			}
		} else if (usuarioLogado.permissao === 'DEV') {
			const coordIdLogado = await coordenadoriaIdDoUsuarioLogado(usuarioLogado);
			if (coordIdLogado) filtroCoordenadoria = coordIdLogado;
		}

		const whereClause: Prisma.AgendamentoWhereInput = {
			dataHora: { gte: hoje, lt: amanha },
			status: { not: 'CANCELADO' },
		};

		if (filtroCoordenadoria) whereClause.coordenadoriaId = filtroCoordenadoria;

		if (filtroDivisaoTecnicoDia && usuarioLogado.permissao === 'PONTO_FOCAL' && filtroPFCoordDia) {
			const envDivPre = divisaoPreProjetosEnv();
			const orBranches: Prisma.AgendamentoWhereInput[] = [
				{ tecnico: { divisaoId: filtroDivisaoTecnicoDia } },
				{ divisaoId: filtroDivisaoTecnicoDia },
				{ coordenadoriaId: filtroPFCoordDia, tecnicoId: null },
			];
			if (envDivPre) orBranches.push({ coordenadoriaId: filtroPFCoordDia, divisaoId: envDivPre });
			whereClause.OR = orBranches;
		} else if (filtroDivisaoTecnicoDia) {
			whereClause.OR = [
				{ tecnico: { divisaoId: filtroDivisaoTecnicoDia } },
				{ divisaoId: filtroDivisaoTecnicoDia },
			];
		}

		if (escopoTecDia?.modo === 'arthur') {
			whereClause.OR = [
				{ tecnicoId: escopoTecDia.usuarioId },
				{ divisaoId: escopoTecDia.divisaoArthurId },
			];
		} else if (filtroTecnico) {
			whereClause.tecnicoId = filtroTecnico;
		}

		const agendamentos = await prisma.agendamento.findMany({
			where: {
				AND: [
					whereClause,
					whereExcluirPreProjetoArthurNaListaAgendamentos(),
					whereExcluirConferenciaCapPendente(),
				],
			},
			orderBy: { dataHora: 'asc' },
			include: INCLUDE_AGENDAMENTO,
		});

		return { ok: true, error: null, data: agendamentos as unknown as IAgendamento[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar os agendamentos do dia:' + error, data: null, status: 400 };
	}
}
