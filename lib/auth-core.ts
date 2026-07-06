import 'server-only';

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { Client as LdapClient } from 'ldapts';
import type { Usuario } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Núcleo de autenticação de staff — porta de AuthService (auth.service.ts) do
 * backend NestJS para dentro do Next.js. Usado pelo NextAuth (authorize + refresh).
 * Mantém os mesmos segredos/tempos de expiração e o mesmo payload do JWT.
 */

export type UsuarioTokenPayload = {
	sub: string;
	login: string;
	nome: string;
	nomeSocial?: string | null;
	email: string;
	status: boolean;
	avatar?: string | null;
	permissao: Usuario['permissao'];
};

const encoder = new TextEncoder();

function payloadDoUsuario(usuario: Usuario): UsuarioTokenPayload {
	return {
		sub: usuario.id,
		login: usuario.login,
		nome: usuario.nome,
		nomeSocial: usuario.nomeSocial,
		email: usuario.email,
		status: usuario.status,
		avatar: usuario.avatar,
		permissao: usuario.permissao,
	};
}

/** Equivalente a AuthService.getTokens: access (15m, JWT_SECRET) + refresh (7d, RT_SECRET). */
export async function getTokens(
	usuario: Usuario,
): Promise<{ access_token: string; refresh_token: string }> {
	const payload = payloadDoUsuario(usuario);

	const access_token = await new SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('15m')
		.sign(encoder.encode(process.env.JWT_SECRET));

	const refresh_token = await new SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(encoder.encode(process.env.RT_SECRET));

	return { access_token, refresh_token };
}

/** Verifica o refresh token (RT_SECRET) e retorna o `sub`, ou null se inválido/expirado. */
export async function verifyRefreshToken(token: string): Promise<string | null> {
	try {
		const { payload } = await jwtVerify(token, encoder.encode(process.env.RT_SECRET));
		return typeof payload.sub === 'string' ? payload.sub : null;
	} catch {
		return null;
	}
}

/**
 * Equivalente a AuthService.validateUser:
 * - usuário com senha (ex.: Portaria) → autenticação local via bcrypt;
 * - ENVIRONMENT=local → ignora LDAP;
 * - caso contrário → bind LDAP.
 * Retorna o usuário (com senha) em caso de sucesso, ou null em caso de falha.
 */
export async function validateUser(login: string, senha: string): Promise<Usuario | null> {
	const usuario = await prisma.usuario.findUnique({ where: { login } });
	if (!usuario) return null;
	if (usuario.status === false) return null;

	// Usuários com senha (ex.: Portaria): apenas autenticação local.
	if (usuario.senha) {
		const ok = await bcrypt.compare(senha, usuario.senha);
		return ok ? usuario : null;
	}

	// Ambiente local: ignora LDAP.
	if (process.env.ENVIRONMENT === 'local') return usuario;

	// Autenticação LDAP.
	const client = new LdapClient({ url: process.env.LDAP_SERVER as string });
	try {
		await client.bind(`${login}${process.env.LDAP_DOMAIN}`, senha);
		return usuario;
	} catch {
		return null;
	} finally {
		try {
			await client.unbind();
		} catch {
			// Ignora erro ao fechar.
		}
	}
}

/** Atualiza o carimbo de último login (equivalente a UsuariosService.atualizarUltimoLogin). */
export async function atualizarUltimoLogin(id: string): Promise<void> {
	await prisma.usuario.update({ where: { id }, data: { ultimoLogin: new Date() } });
}
