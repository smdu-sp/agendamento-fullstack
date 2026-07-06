import 'server-only';

import { $Enums } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buscarSiglaUnidadePorUsuarioRede } from '@/lib/prisma-sgu';
import { AuthzError } from '@/lib/authz';

/**
 * Helpers de negócio de usuários — porta dos métodos privados de
 * UsuariosService (usuarios.service.ts) usados por criar/atualizar.
 */

type Permissao = $Enums.Permissao;

export function normalizarSigla(valor: string): string {
	return String(valor || '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '');
}

export function normalizarPermissao(permissao: unknown): Permissao | undefined {
	if (typeof permissao !== 'string') return undefined;
	const valor = permissao.trim();
	if (!valor) return undefined;
	const permissoesValidas = Object.values($Enums.Permissao) as string[];
	return permissoesValidas.includes(valor) ? (valor as Permissao) : undefined;
}

/** Regras de qual permissão um criador pode atribuir. Lança AuthzError(403) se inválido. */
export function validaPermissaoCriador(
	permissao: Permissao,
	permissaoCriador: Permissao,
): Permissao {
	if (permissao === $Enums.Permissao.DEV && permissaoCriador === $Enums.Permissao.ADM) {
		permissao = $Enums.Permissao.ADM;
	}
	// Ponto Focal e Coordenador só podem atribuir USR, PONTO_FOCAL e TEC.
	const permissoesCoord: Permissao[] = ['USR', 'PONTO_FOCAL', 'TEC'];
	if (
		(permissaoCriador === 'PONTO_FOCAL' || permissaoCriador === 'COORDENADOR') &&
		!permissoesCoord.includes(permissao)
	) {
		throw new AuthzError(
			'Ponto Focal e Coordenador só podem atribuir permissões: Usuário, Ponto Focal e Técnico.',
			403,
		);
	}
	return permissao;
}

/** Infere `divisaoId` a partir do SGU (sigla da unidade → divisão local). */
export async function inferirDivisaoIdPorLoginNoSgu(
	login: string | undefined,
): Promise<string | undefined> {
	const loginLimpo = String(login || '')
		.trim()
		.toLowerCase();
	if (!loginLimpo) return undefined;

	const siglaSgu = await buscarSiglaUnidadePorUsuarioRede(loginLimpo);
	if (!siglaSgu) return undefined;

	const siglaNormalizada = normalizarSigla(siglaSgu);
	if (!siglaNormalizada) return undefined;

	const divisoes = await prisma.divisao.findMany({
		where: { status: true },
		select: { id: true, sigla: true },
	});
	const match = divisoes.find((d) => normalizarSigla(d.sigla) === siglaNormalizada);
	return match?.id;
}

/**
 * Preenche `divisaoId` do técnico/DEV a partir do SGU (sigla da unidade → divisão local).
 * Se o SGU não achar unidade e `coordenadoriaIdImportacao` for informado, usa a primeira
 * divisão ativa dessa coordenadoria (útil na importação de planilha).
 * Port de UsuariosService.vincularDivisaoTecnicoPorLoginSeDisponivel.
 */
export async function vincularDivisaoTecnicoPorLoginSeDisponivel(
	login: string | undefined,
	coordenadoriaIdImportacao?: string,
): Promise<string | null> {
	const loginLimpo = String(login || '')
		.trim()
		.toLowerCase();
	if (!loginLimpo) return null;

	const usuario = await prisma.usuario.findUnique({
		where: { login: loginLimpo },
		select: { id: true, permissao: true, divisaoId: true },
	});
	if (!usuario) return null;
	if (usuario.divisaoId) return usuario.divisaoId;
	if (usuario.permissao !== 'TEC' && usuario.permissao !== 'DEV') return null;

	let divisaoIdInferida = await inferirDivisaoIdPorLoginNoSgu(loginLimpo);
	if (!divisaoIdInferida && coordenadoriaIdImportacao?.trim()) {
		const divCoord = await prisma.divisao.findFirst({
			where: { coordenadoriaId: coordenadoriaIdImportacao.trim(), status: true },
			orderBy: { sigla: 'asc' },
			select: { id: true },
		});
		divisaoIdInferida = divCoord?.id;
	}
	if (!divisaoIdInferida) return null;

	await prisma.usuario.update({
		where: { id: usuario.id },
		data: { divisaoId: divisaoIdInferida },
	});
	return divisaoIdInferida;
}

/** Divisão padrão do fluxo Arthur Saboya (env DIVISAO_ID_PRE_PROJETOS ou heurística CAP). */
export async function obterDivisaoArthurSaboyaId(): Promise<string> {
	const divisaoIdEnv = process.env.DIVISAO_ID_PRE_PROJETOS?.trim();
	if (divisaoIdEnv) {
		const divisaoEnv = await prisma.divisao.findUnique({
			where: { id: divisaoIdEnv },
			select: { id: true },
		});
		if (divisaoEnv?.id) return divisaoEnv.id;
	}

	const divisaoArthur = await prisma.divisao.findFirst({
		where: {
			status: true,
			coordenadoria: { sigla: 'CAP' },
			OR: [
				{ sigla: 'ARTHUR_SABOYA' },
				{ sigla: 'ATHURSABOYA' },
				{ nome: { contains: 'Arthur Saboya' } },
			],
		},
		select: { id: true },
	});
	if (divisaoArthur?.id) return divisaoArthur.id;

	throw new AuthzError(
		'Divisão padrão do Arthur Saboya não encontrada (CAP/ATHURSABOYA).',
		404,
	);
}
