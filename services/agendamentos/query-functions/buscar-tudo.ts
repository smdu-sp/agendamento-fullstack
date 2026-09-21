/** @format */

'use server';

import { Prisma } from '@prisma/client';
import type { StatusAgendamento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError, type UsuarioAutenticado } from '@/lib/authz';
import { verificaPagina, verificaLimite } from '@/lib/paginacao';
import {
	INCLUDE_AGENDAMENTO,
	escopoListaAgendamentosParaTec,
	coordenadoriaIdDoUsuarioLogado,
	divisaoPreProjetosEnv,
	getPreProjetoTipoAgendamentoId,
	mascararCPF,
	whereExcluirPreProjetoArthurNaListaAgendamentos,
} from '@/lib/agendamentos-core';
import { whereExcluirConferenciaCapPendente } from '@/lib/portal-processos-core';
import { IAgendamento, IPaginadoAgendamento, IRespostaAgendamento } from '@/types/agendamento';

const REGEX_PROCESSO_DIGITAL_SQL = '^[0-9]{4}[.][0-9]{4}/[0-9]{7}-[0-9]$';

function montarWhereSqlBuscarTudo(
	busca: string | undefined,
	status: string | undefined,
	dataInicio: string | undefined,
	dataFim: string | undefined,
	filtroCoordenadoria: string | undefined,
	coordenadoriaId: string | undefined,
	tecnicoId: string | undefined,
	tecArthurDivisaoOpcional: string | undefined,
	filtroDivisaoTecnico: string | undefined,
	filtroPFCoordSemTecnico: string | undefined,
	filtroPFDivisaoArthurEncaminhado: string | undefined,
	preProjetoTipoAgendamentoIdExcluir: string | null,
	tipoProcesso: 'DIGITAL' | 'FISICO',
): Prisma.Sql {
	const parts: Prisma.Sql[] = [];
	const regexLiteral = Prisma.raw(`'${REGEX_PROCESSO_DIGITAL_SQL}'`);

	if (busca) {
		const p = `%${busca}%`;
		parts.push(
			Prisma.sql`(COALESCE(municipe,'') LIKE ${p} OR COALESCE(processo,'') LIKE ${p} OR COALESCE(cpf,'') LIKE ${p})`,
		);
	}
	if (status && status !== '') {
		parts.push(Prisma.sql`status = ${status as StatusAgendamento}`);
	}
	if (dataInicio && dataFim) {
		parts.push(
			Prisma.sql`dataHora >= ${new Date(dataInicio + 'T00:00:00.000Z')} AND dataHora <= ${new Date(dataFim + 'T23:59:59.999Z')}`,
		);
	}
	if (filtroCoordenadoria) {
		parts.push(Prisma.sql`coordenadoriaId = ${filtroCoordenadoria}`);
	}
	if (coordenadoriaId && !filtroDivisaoTecnico) {
		parts.push(Prisma.sql`coordenadoriaId = ${coordenadoriaId}`);
	}
	if (tecArthurDivisaoOpcional && tecnicoId) {
		parts.push(Prisma.sql`(tecnicoId = ${tecnicoId} OR divisaoId = ${tecArthurDivisaoOpcional})`);
	} else if (tecnicoId) {
		parts.push(Prisma.sql`tecnicoId = ${tecnicoId}`);
	}
	if (filtroDivisaoTecnico) {
		const porDivisaoAg = Prisma.sql`divisaoId = ${filtroDivisaoTecnico}`;
		const porArthurEncaminhado =
			filtroPFCoordSemTecnico && filtroPFDivisaoArthurEncaminhado
				? Prisma.sql`(coordenadoriaId = ${filtroPFCoordSemTecnico} AND divisaoId = ${filtroPFDivisaoArthurEncaminhado})`
				: null;
		if (filtroPFCoordSemTecnico) {
			parts.push(
				Prisma.sql`(tecnicoId IN (SELECT id FROM usuarios WHERE divisaoId = ${filtroDivisaoTecnico}) OR (coordenadoriaId = ${filtroPFCoordSemTecnico} AND tecnicoId IS NULL) OR ${porDivisaoAg}${porArthurEncaminhado ? Prisma.sql` OR ${porArthurEncaminhado}` : Prisma.empty})`,
			);
		} else {
			parts.push(
				Prisma.sql`(tecnicoId IN (SELECT id FROM usuarios WHERE divisaoId = ${filtroDivisaoTecnico}) OR ${porDivisaoAg})`,
			);
		}
	}
	if (tipoProcesso === 'DIGITAL') {
		parts.push(Prisma.sql`processo IS NOT NULL AND TRIM(processo) REGEXP ${regexLiteral}`);
	} else {
		parts.push(Prisma.sql`(processo IS NULL OR TRIM(processo) NOT REGEXP ${regexLiteral})`);
	}
	if (preProjetoTipoAgendamentoIdExcluir) {
		parts.push(
			Prisma.sql`(tipoAgendamentoId IS NULL OR tipoAgendamentoId <> ${preProjetoTipoAgendamentoIdExcluir})`,
		);
	}
	parts.push(
		Prisma.sql`(conferenciaCapStatus IS NULL OR conferenciaCapStatus <> ${'AGUARDANDO'})`,
	);

	return parts.length ? Prisma.join(parts, ' AND ') : Prisma.sql`TRUE`;
}

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	status: string = '',
	dataInicio: string = '',
	dataFim: string = '',
	coordenadoriaId: string = '',
	tecnicoId: string = '',
	tipoProcesso: string = '',
): Promise<IRespostaAgendamento> {
	try {
		const usuarioLogado = await requireUsuario();
		verificarPermissoes(usuarioLogado, ['ADM', 'DEV', 'TEC', 'PONTO_FOCAL', 'COORDENADOR', 'PORTARIA', 'DIRETOR']);

		const resultado = await executarBuscarTudo(
			usuarioLogado,
			pagina,
			limite,
			busca || undefined,
			status || undefined,
			dataInicio || undefined,
			dataFim || undefined,
			coordenadoriaId || undefined,
			tecnicoId || undefined,
			tipoProcesso || undefined,
		);
		return { ok: true, error: null, data: resultado, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de agendamentos: ' + (error instanceof Error ? error.message : String(error)),
			data: null,
			status: 400,
		};
	}
}

async function executarBuscarTudo(
	usuarioLogado: UsuarioAutenticado,
	pagina: number,
	limite: number,
	busca?: string,
	status?: string,
	dataInicio?: string,
	dataFim?: string,
	coordenadoriaId?: string,
	tecnicoId?: string,
	tipoProcesso?: string,
): Promise<IPaginadoAgendamento> {
	[pagina, limite] = verificaPagina(pagina, limite);

	let filtroCoordenadoria: string | undefined;
	let filtroDivisaoTecnico: string | undefined;
	let filtroPFCoordSemTecnico: string | undefined;
	let escopoTecLista: ReturnType<typeof escopoListaAgendamentosParaTec> | undefined;

	if (usuarioLogado.permissao === 'PONTO_FOCAL') {
		const divisaoIdLogado = usuarioLogado.divisaoId ?? undefined;
		if (!divisaoIdLogado) return { total: 0, pagina: 0, limite: 0, data: [] };
		filtroDivisaoTecnico = divisaoIdLogado;
		filtroPFCoordSemTecnico = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
	} else if (usuarioLogado.permissao === 'COORDENADOR') {
		const coordIdLogado = usuarioLogado.divisao?.coordenadoriaId ?? undefined;
		if (!coordIdLogado) return { total: 0, pagina: 0, limite: 0, data: [] };
		filtroCoordenadoria = coordIdLogado;
	} else if (usuarioLogado.permissao === 'DIRETOR') {
		const divisaoIdLogado = usuarioLogado.divisaoId ?? undefined;
		if (!divisaoIdLogado) return { total: 0, pagina: 0, limite: 0, data: [] };
		filtroDivisaoTecnico = divisaoIdLogado;
	} else if (usuarioLogado.permissao === 'TEC') {
		const escTecLista = escopoListaAgendamentosParaTec(usuarioLogado);
		if (escTecLista.modo === 'dev_impersona_tec_sem_divisao') {
			return { total: 0, pagina: 0, limite: 0, data: [] };
		}
		if (escTecLista.modo === 'dev_impersona_tec') {
			filtroDivisaoTecnico = escTecLista.divisaoId;
			tecnicoId = undefined;
		} else {
			escopoTecLista = escTecLista;
			tecnicoId = escTecLista.usuarioId;
		}
	} else if (usuarioLogado.permissao === 'DEV') {
		const coordIdLogado = await coordenadoriaIdDoUsuarioLogado(usuarioLogado);
		if (coordIdLogado) filtroCoordenadoria = coordIdLogado;
	}
	// ADM, PORTARIA e DEV sem unidade veem todos.

	const envDivPre = divisaoPreProjetosEnv();

	let pontoFocalWhere: Prisma.AgendamentoWhereInput | undefined;
	if (filtroDivisaoTecnico) {
		if (filtroPFCoordSemTecnico) {
			const orBranches: Prisma.AgendamentoWhereInput[] = [
				{ tecnico: { divisaoId: filtroDivisaoTecnico } },
				{ divisaoId: filtroDivisaoTecnico },
				{ coordenadoriaId: filtroPFCoordSemTecnico, tecnicoId: null },
			];
			if (envDivPre) orBranches.push({ coordenadoriaId: filtroPFCoordSemTecnico, divisaoId: envDivPre });
			pontoFocalWhere = { OR: orBranches };
		} else {
			pontoFocalWhere = {
				OR: [
					{ tecnico: { divisaoId: filtroDivisaoTecnico } },
					{ divisaoId: filtroDivisaoTecnico },
				],
			};
		}
	}

	const filtrosPrincipais: Prisma.AgendamentoWhereInput = {
		...(busca && {
			OR: [
				{ municipe: { contains: busca } },
				{ processo: { contains: busca } },
				{ cpf: { contains: busca } },
			],
		}),
		...(status && status !== '' && { status: status as StatusAgendamento }),
		...(dataInicio &&
			dataFim && {
				dataHora: {
					gte: new Date(dataInicio + 'T00:00:00.000Z'),
					lte: new Date(dataFim + 'T23:59:59.999Z'),
				},
			}),
		...(filtroCoordenadoria && { coordenadoriaId: filtroCoordenadoria }),
		...(coordenadoriaId && !filtroDivisaoTecnico && { coordenadoriaId }),
		...(escopoTecLista?.modo === 'arthur' && {
			OR: [
				{ tecnicoId: escopoTecLista.usuarioId },
				{ divisaoId: escopoTecLista.divisaoArthurId },
			],
		}),
		...(escopoTecLista?.modo === 'proprio' && { tecnicoId: escopoTecLista.usuarioId }),
		...(tecnicoId && !escopoTecLista && { tecnicoId }),
		...pontoFocalWhere,
	};

	const searchParams: Prisma.AgendamentoWhereInput = {
		AND: [
			filtrosPrincipais,
			whereExcluirPreProjetoArthurNaListaAgendamentos(),
			whereExcluirConferenciaCapPendente(),
		],
	};

	const tipoFiltro = tipoProcesso === 'DIGITAL' || tipoProcesso === 'FISICO' ? tipoProcesso : undefined;

	if (tipoFiltro) {
		const preProjetoTipoIdExcluir = await getPreProjetoTipoAgendamentoId();
		const whereSql = montarWhereSqlBuscarTudo(
			busca,
			status,
			dataInicio,
			dataFim,
			filtroCoordenadoria,
			coordenadoriaId,
			tecnicoId,
			escopoTecLista?.modo === 'arthur' ? escopoTecLista.divisaoArthurId : undefined,
			filtroDivisaoTecnico,
			usuarioLogado.permissao === 'PONTO_FOCAL' ? filtroPFCoordSemTecnico : undefined,
			usuarioLogado.permissao === 'PONTO_FOCAL' ? envDivPre : undefined,
			preProjetoTipoIdExcluir ?? null,
			tipoFiltro,
		);

		const countRows = await prisma.$queryRaw<[{ c: bigint }]>`
			SELECT COUNT(*) AS c FROM agendamentos WHERE ${whereSql}
		`;
		const total = Number(countRows[0]?.c ?? 0);
		if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };
		[pagina, limite] = verificaLimite(pagina, limite, total);

		const idRows = await prisma.$queryRaw<{ id: string }[]>`
			SELECT id FROM agendamentos WHERE ${whereSql}
			ORDER BY dataHora ASC
			LIMIT ${limite} OFFSET ${(pagina - 1) * limite}
		`;
		const ids = idRows.map((r) => r.id);
		if (ids.length === 0) return { total, pagina, limite, data: [] };

		const agendamentos = await prisma.agendamento.findMany({
			where: { id: { in: ids } },
			orderBy: { dataHora: 'asc' },
			include: INCLUDE_AGENDAMENTO,
		});
		agendamentos.forEach((ag) => (ag.cpf = mascararCPF(ag.cpf)));

		return { total, pagina, limite, data: agendamentos as unknown as IAgendamento[] };
	}

	const total = await prisma.agendamento.count({ where: searchParams });
	if (total === 0) return { total: 0, pagina: 0, limite: 0, data: [] };
	[pagina, limite] = verificaLimite(pagina, limite, total);

	const agendamentos = await prisma.agendamento.findMany({
		where: searchParams,
		orderBy: { dataHora: 'asc' },
		skip: (pagina - 1) * limite,
		take: limite,
		include: INCLUDE_AGENDAMENTO,
	});
	agendamentos.forEach((ag) => (ag.cpf = mascararCPF(ag.cpf)));

	return { total, pagina, limite, data: agendamentos as unknown as IAgendamento[] };
}
