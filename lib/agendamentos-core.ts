import 'server-only';

import { Prisma } from '@prisma/client';
import type { Usuario } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buscarUsuarioLdapPorLogin } from '@/lib/ldap';
import {
	inferirDivisaoIdPorLoginNoSgu,
	vincularDivisaoTecnicoPorLoginSeDisponivel,
} from '@/lib/usuarios-core';

/**
 * Núcleo compartilhado do domínio de agendamentos — porta dos helpers privados
 * de AgendamentosService (agendamentos.service.ts). Usado pelos services de
 * CRUD/dashboard/importação.
 */

/** Texto único em `tipos_agendamento` para o fluxo de pré-projetos (Arthur Saboya). */
export const PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO = 'Pré-projetos (Arthur Saboya)';
/** Duração padrão (min) de cada atendimento da Sala Arthur Saboya. */
export const PRE_PROJETO_DURACAO_ATENDIMENTO_MINUTOS = 30;

/** `include` padrão dos agendamentos nas respostas (mesmo shape do backend). */
export const INCLUDE_AGENDAMENTO = {
	tipoAgendamento: true,
	motivoNaoAtendimento: true,
	coordenadoria: true,
	tecnico: {
		select: {
			id: true,
			nome: true,
			login: true,
			email: true,
			divisao: { select: { sigla: true } },
		},
	},
} satisfies Prisma.AgendamentoInclude;

// --- Env helpers ---
export function divisaoPreProjetosEnv(): string | undefined {
	const v = process.env.DIVISAO_ID_PRE_PROJETOS?.trim();
	return v || undefined;
}
export function coordenadoriaPreProjetosEnv(): string | undefined {
	const v = process.env.COORDENADORIA_ID_PRE_PROJETOS?.trim();
	return v || undefined;
}

export async function getPreProjetoTipoAgendamentoId(): Promise<string | null> {
	const t = await prisma.tipoAgendamento.findUnique({
		where: { texto: PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO },
		select: { id: true },
	});
	return t?.id ?? null;
}

/**
 * Exclui agendamentos do tipo pré-projetos Arthur da listagem/dashboard
 * (fluxo separado, tratado no menu Pedidos Arthur Saboya).
 */
export function whereExcluirPreProjetoArthurNaListaAgendamentos(): Prisma.AgendamentoWhereInput {
	return { NOT: { tipoAgendamento: { texto: PRE_PROJETO_TIPO_AGENDAMENTO_TEXTO } } };
}

// --- Nome / CPF / datas ---
const PREPOSICOES_PT = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os']);

/** "AMANDA CELLI FILHO" -> "Amanda Celli Filho" (preposições em minúsculas). */
export function padronizarNome(nome: string | null): string | null {
	if (!nome || typeof nome !== 'string') return nome;
	return nome
		.trim()
		.split(/\s+/)
		.map((palavra, index) => {
			if (!palavra) return palavra;
			const lower = palavra.toLowerCase();
			if (index > 0 && PREPOSICOES_PT.has(lower)) return lower;
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');
}

export function mascararCPF(cpf: string | null): string {
	if (!cpf) return '';
	const digits = cpf.replace(/\D/g, '');
	if (digits.length < 11) return cpf;
	return digits.substring(0, 3) + '.***.***-' + digits.substring(9, 11);
}

export function calcularDataFim(dataHora: Date, duracao: number = 60): Date {
	const dataFim = new Date(dataHora);
	dataFim.setMinutes(dataFim.getMinutes() + duracao);
	return dataFim;
}

/**
 * Preserva data/hora civil de SP sem deslocamento de fuso (ex.: "18:20" permanece
 * 18:20 ao serializar para ISO). Usado na importação de planilhas.
 */
export function instanteCivilSaoPauloSemDeslocamento(
	ano: number,
	mesIndex0: number,
	dia: number,
	hora: number,
	minuto: number,
	segundo: number,
): Date {
	return new Date(Date.UTC(ano, mesIndex0, dia, hora, minuto, segundo));
}

export function formatarDataHoraSaoPaulo(data: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(data.getUTCDate())}/${pad(data.getUTCMonth() + 1)}/${data.getUTCFullYear()} às ${pad(data.getUTCHours())}:${pad(data.getUTCMinutes())}`;
}

// --- Técnico ---
export function rfParaLogin(rf: string): string | null {
	if (!rf || rf.length < 6) return null;
	return `d${rf.substring(0, 6)}`;
}

export function usuarioPodeSerTecnicoAtribuido(usuario: {
	permissao: string;
	divisaoId?: string | null;
}): boolean {
	return usuario.permissao === 'TEC' || (usuario.permissao === 'DEV' && !!usuario.divisaoId);
}

/** Busca tipo de agendamento por texto; cadastra se não existir. */
export async function buscarOuCriarTipoPorTexto(texto: string): Promise<string | undefined> {
	const t = String(texto).trim();
	if (!t) return undefined;
	const existente = await prisma.tipoAgendamento.findUnique({ where: { texto: t } });
	if (existente) return existente.id;
	const novo = await prisma.tipoAgendamento.create({ data: { texto: t, status: true } });
	return novo.id;
}

/** Coordenadoria por sigla exata (equivalente a CoordenadoriasService.buscarPorSigla). */
export async function buscarCoordenadoriaPorSigla(sigla: string) {
	return prisma.coordenadoria.findUnique({ where: { sigla } });
}

/** Busca coordenadoria por sigla; cadastra (sigla=nome) se não existir. Usado na importação. */
export async function buscarOuCriarCoordenadoriaPorSiglaImport(
	sigla: string,
): Promise<string | undefined> {
	const s = sigla.trim();
	if (!s) return undefined;
	const existente = await prisma.coordenadoria.findUnique({ where: { sigla: s } });
	if (existente) return existente.id;
	try {
		const nova = await prisma.coordenadoria.create({
			data: { sigla: s, nome: s, status: true },
		});
		return nova.id;
	} catch {
		const recriada = await prisma.coordenadoria.findUnique({ where: { sigla: s } });
		return recriada?.id;
	}
}

/** Registra log de importação (planilha). Ignora P2021 (tabela ausente). */
export async function registrarImportacaoPlanilha(total: number, usuarioId?: string): Promise<void> {
	try {
		await prisma.logImportacaoPlanilha.create({ data: { total, usuarioId: usuarioId ?? undefined } });
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2021') return;
		throw e;
	}
}

/** Registra log de importação (Outlook). Ignora P2021. */
export async function registrarImportacaoOutlook(total: number, usuarioId?: string): Promise<void> {
	try {
		await prisma.logImportacaoOutlook.create({ data: { total, usuarioId: usuarioId ?? undefined } });
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2021') return;
		throw e;
	}
}

/** Divisão do usuário técnico, quando houver vínculo; caso contrário null. */
export async function divisaoIdDoTecnico(tecnicoId: string | null): Promise<string | null> {
	if (!tecnicoId) return null;
	const u = await prisma.usuario.findUnique({
		where: { id: tecnicoId },
		select: { divisaoId: true },
	});
	return u?.divisaoId ?? null;
}

export async function coordenadoriaIdDoUsuarioLogado(
	usuario?: UsuarioComContexto,
): Promise<string | undefined> {
	if (!usuario) return undefined;
	const coordViaToken = usuario.divisao?.coordenadoriaId ?? undefined;
	if (coordViaToken) return coordViaToken;
	const divisaoId = usuario.divisaoId ?? undefined;
	if (!divisaoId) return undefined;
	const d = await prisma.divisao.findUnique({
		where: { id: divisaoId },
		select: { coordenadoriaId: true },
	});
	return d?.coordenadoriaId ?? undefined;
}

/**
 * Usuário logado com o contexto de divisão/coordenadoria e permissão
 * personificada, equivalente ao `request.user` do backend.
 */
export type UsuarioComContexto = Omit<Usuario, 'senha'> & {
	permissaoReal?: string;
	divisao?: {
		id: string;
		sigla: string;
		nome: string | null;
		coordenadoriaId: string | null;
		coordenadoria?: { id: string; sigla: string; nome: string | null } | null;
	} | null;
};

/**
 * Escopo de listagem de agendamentos para um TEC (ver comentário do backend).
 */
export function escopoListaAgendamentosParaTec(
	usuario: UsuarioComContexto,
):
	| { modo: 'dev_impersona_tec'; divisaoId: string }
	| { modo: 'dev_impersona_tec_sem_divisao' }
	| { modo: 'arthur'; divisaoArthurId: string; usuarioId: string }
	| { modo: 'proprio'; usuarioId: string } {
	const permReal = usuario.permissaoReal;
	if (usuario.permissao === 'TEC' && permReal === 'DEV') {
		const divisaoDev = usuario.divisaoId;
		if (!divisaoDev) return { modo: 'dev_impersona_tec_sem_divisao' };
		return { modo: 'dev_impersona_tec', divisaoId: divisaoDev };
	}
	const divisaoArthur = divisaoPreProjetosEnv();
	const divisaoUsuario = usuario.divisaoId ?? undefined;
	if (divisaoArthur && divisaoUsuario && divisaoUsuario === divisaoArthur) {
		return { modo: 'arthur', divisaoArthurId: divisaoArthur, usuarioId: usuario.id };
	}
	return { modo: 'proprio', usuarioId: usuario.id };
}

/**
 * Busca ou cria técnico a partir do RF da planilha. Port de
 * AgendamentosService.buscarOuCriarTecnicoPorRF (usado por criar/atualizar e importação).
 */
export async function buscarOuCriarTecnicoPorRF(
	rf: string,
	coordenadoriaId?: string,
	emailPlanilha?: string,
): Promise<string | null> {
	if (!rf) return null;
	const login = rfParaLogin(rf);
	if (!login) return null;

	try {
		const usuario = await prisma.usuario.findUnique({ where: { login } });
		if (usuario) {
			await vincularDivisaoTecnicoPorLoginSeDisponivel(login, coordenadoriaId);
			return usuario.id;
		}

		let dados: { login: string; nome: string; email: string } | null = null;
		try {
			const ldap = await buscarUsuarioLdapPorLogin(login);
			if (ldap) {
				dados = { login: ldap.login, nome: ldap.nome, email: emailPlanilha || ldap.email };
			}
		} catch {
			// Erro de conexão LDAP: cai no fallback de usuário básico abaixo.
			dados = null;
		}

		if (!dados) {
			// Não encontrado no LDAP: cria usuário básico com permissão TEC.
			const nomeBasico = login.charAt(0).toUpperCase() + login.slice(1);
			const emailFinal = emailPlanilha || `${login}@smul.prefeitura.sp.gov.br`;
			dados = { login, nome: nomeBasico, email: emailFinal };
		}

		try {
			// Cria o técnico direto (equivalente a criar com ADM: valida TEC, infere divisão).
			const divisaoId = await inferirDivisaoIdPorLoginNoSgu(dados.login);
			const novoTecnico = await prisma.usuario.create({
				data: {
					nome: dados.nome,
					login: dados.login,
					email: dados.email,
					permissao: 'TEC',
					status: true,
					divisaoId: divisaoId ?? undefined,
				},
			});
			await vincularDivisaoTecnicoPorLoginSeDisponivel(dados.login, coordenadoriaId);
			return novoTecnico.id;
		} catch (error) {
			console.log(`Erro ao criar técnico ${dados.login}:`, (error as Error).message);
		}
	} catch (error) {
		console.log(`Erro ao buscar/criar técnico com RF ${rf}:`, (error as Error).message);
	}

	return null;
}
