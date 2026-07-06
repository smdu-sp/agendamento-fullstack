import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import type { Permissao, Usuario } from '@prisma/client';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';

/**
 * Réplica em Next.js da cadeia de guards do backend NestJS:
 * JwtAuthGuard -> ImpersonationGuard -> RoleGuard (nessa ordem).
 * Usado por Server Actions / Route Handlers no lugar dos guards/decorators
 * originais (@Permissoes, @UsuarioAtual) enquanto os domínios são migrados.
 */

const PERMISSOES_IMPERSONAVEIS: Permissao[] = [
	'DEV',
	'ADM',
	'TEC',
	'USR',
	'PONTO_FOCAL',
	'COORDENADOR',
	'PORTARIA',
];

type DivisaoComCoordenadoria = {
	id: string;
	sigla: string;
	nome: string | null;
	coordenadoriaId: string | null;
	coordenadoria: { id: string; sigla: string; nome: string | null } | null;
};

export type UsuarioAutenticado = Omit<Usuario, 'senha'> & {
	divisao: DivisaoComCoordenadoria | null;
	/** Permissão real do usuário, presente apenas quando um DEV está personificando outra permissão. */
	permissaoReal?: Permissao;
};

export class AuthzError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

/** Equivalente ao ImpersonationGuard: só se aplica a usuários DEV reais. */
async function resolverPermissaoEfetiva(
	permissaoReal: Permissao,
): Promise<{ permissao: Permissao; permissaoReal?: Permissao }> {
	if (permissaoReal !== 'DEV') return { permissao: permissaoReal };

	const cookieStore = await cookies();
	const raw = cookieStore.get('impersonate_permissao')?.value;
	const permissao = raw?.trim().toUpperCase();
	if (!permissao || !PERMISSOES_IMPERSONAVEIS.includes(permissao as Permissao)) {
		return { permissao: permissaoReal };
	}
	return { permissao: permissao as Permissao, permissaoReal };
}

/** Usuário da sessão atual, ou `null` se não autenticado. Não lança nem redireciona. */
export async function getSessionUsuario(): Promise<UsuarioAutenticado | null> {
	const session = await auth();
	const id = session?.usuario?.sub;
	if (!id) return null;

	const usuario = await prisma.usuario.findUnique({
		where: { id },
		select: SELECT_USUARIO_SEM_SENHA,
	});
	if (!usuario) return null;

	const { permissao, permissaoReal } = await resolverPermissaoEfetiva(usuario.permissao);
	return { ...usuario, permissao, permissaoReal };
}

/** Para leituras: sem sessão vira erro 401 (equivalente ao JwtAuthGuard), não redirect. */
export async function requireUsuario(): Promise<UsuarioAutenticado> {
	const usuario = await getSessionUsuario();
	if (!usuario) throw new AuthzError('Não autenticado.', 401);
	return usuario;
}

/** Para mutações client-facing: sem sessão manda pro /login, como o código original fazia. */
export async function requireUsuarioOuRedirect(): Promise<UsuarioAutenticado> {
	const usuario = await getSessionUsuario();
	if (!usuario) redirect('/login');
	return usuario;
}

/** Equivalente ao RoleGuard: DEV (real ou personificado) e ADM real sempre passam. */
export function verificarPermissoes(
	usuario: UsuarioAutenticado,
	permissoes: Permissao[],
): void {
	if (usuario.permissao === 'DEV') return;
	if (usuario.permissaoReal === 'DEV') return;
	if (usuario.permissaoReal === 'ADM') return;
	if (!permissoes.includes(usuario.permissao)) {
		throw new AuthzError('Você não tem permissão para executar esta ação.', 403);
	}
}

export async function requirePermissoes(...permissoes: Permissao[]): Promise<UsuarioAutenticado> {
	const usuario = await requireUsuario();
	verificarPermissoes(usuario, permissoes);
	return usuario;
}

export async function requirePermissoesOuRedirect(
	...permissoes: Permissao[]
): Promise<UsuarioAutenticado> {
	const usuario = await requireUsuarioOuRedirect();
	verificarPermissoes(usuario, permissoes);
	return usuario;
}

export type MunicipePayload = {
	id: string;
	email: string;
	nome?: string;
};

/**
 * Equivalente ao MunicipeJwtAuthGuard — verifica o Bearer token do
 * cidadão (JWT `escopo: MUNICIPE`) enviado no header Authorization.
 * Usado a partir da Fase 7 (municipes-auth / pré-projetos), a função já
 * fica pronta aqui pois faz parte da mesma infra de autenticação.
 */
export async function getMunicipeAtual(request: Request): Promise<MunicipePayload | null> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) return null;
	const token = authHeader.slice(7).trim();
	if (!token) return null;

	try {
		const secret = new TextEncoder().encode(process.env.JWT_SECRET);
		const { payload } = await jwtVerify(token, secret);
		if (payload.escopo !== 'MUNICIPE' || !payload.sub || !payload.email) return null;
		return {
			id: String(payload.sub),
			email: String(payload.email).trim().toLowerCase(),
			nome: typeof payload.nome === 'string' ? payload.nome : undefined,
		};
	} catch {
		return null;
	}
}
