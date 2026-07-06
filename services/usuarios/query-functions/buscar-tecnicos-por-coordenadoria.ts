/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { IRespostaUsuario } from '@/types/usuario';

export interface ITecnico {
	id: string;
	nome: string;
	login: string;
	email: string;
}

// Técnicos: TEC, ou DEV que já tenha divisão atribuída.
const OR_TECNICOS = [
	{ permissao: 'TEC' as const },
	{ permissao: 'DEV' as const, divisaoId: { not: null } },
];

const SELECT_TECNICO = { id: true, nome: true, login: true, email: true } as const;

export async function buscarTecnicosPorCoordenadoria(
	coordenadoriaId: string,
): Promise<IRespostaUsuario> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const tecnicos = await prisma.usuario.findMany({
			where: { status: true, divisao: { coordenadoriaId }, OR: OR_TECNICOS },
			orderBy: { nome: 'asc' },
			select: SELECT_TECNICO,
		});
		return { ok: true, error: null, data: tecnicos as ITecnico[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar os técnicos:' + error, data: null, status: 400 };
	}
}

export async function buscarTecnicosPorDivisao(divisaoId: string): Promise<IRespostaUsuario> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		// Ponto Focal e Coordenador (que não sejam DEV real/efetivo) só veem a própria divisão.
		const isDevRealOuEfetivo = usuario.permissao === 'DEV' || usuario.permissaoReal === 'DEV';
		if (
			!isDevRealOuEfetivo &&
			(usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR') &&
			usuario.divisaoId !== divisaoId
		) {
			throw new AuthzError('Você só pode buscar técnicos da sua divisão.', 403);
		}

		const tecnicos = await prisma.usuario.findMany({
			where: { status: true, divisaoId, OR: OR_TECNICOS },
			orderBy: { nome: 'asc' },
			select: SELECT_TECNICO,
		});
		return { ok: true, error: null, data: tecnicos as ITecnico[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar os técnicos:' + error, data: null, status: 400 };
	}
}

export async function buscarTecnicosArthurSaboya(): Promise<IRespostaUsuario> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR', 'ARTHUR_SABOYA']);

		const tecnicos = await prisma.usuario.findMany({
			where: { status: true, permissao: 'ARTHUR_SABOYA' },
			orderBy: { nome: 'asc' },
			select: SELECT_TECNICO,
		});
		return { ok: true, error: null, data: tecnicos as ITecnico[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar os técnicos da Arthur Saboya:' + error,
			data: null,
			status: 400,
		};
	}
}
