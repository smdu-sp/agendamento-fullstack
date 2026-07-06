/** @format */

import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig, User } from 'next-auth';
import { jwtDecode } from 'jwt-decode';
import { prisma } from '@/lib/prisma';
import {
	validateUser,
	getTokens,
	verifyRefreshToken,
	atualizarUltimoLogin,
} from '@/lib/auth-core';

export default {
	providers: [
		Credentials({
			name: 'credentials',
			credentials: {
				login: { label: 'Login', type: 'text' },
				senha: { label: 'Senha', type: 'password' },
			},
			type: 'credentials',
			async authorize(credentials) {
				if (!credentials?.login || !credentials?.senha) return null;
				const login = String(credentials.login);
				const senha = String(credentials.senha);
				try {
					// Autenticação in-process (bcrypt/LDAP) — antes era um POST ao backend NestJS.
					const usuario = await validateUser(login, senha);
					if (!usuario) return null;
					const tokens = await getTokens(usuario);
					await atualizarUltimoLogin(usuario.id);
					// O shape (só tokens) é o mesmo que o backend /login retornava;
					// as claims do usuário são derivadas do access_token nos callbacks.
					return { ...tokens } as unknown as User;
				} catch {
					return null;
				}
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (trigger === 'update' && session) {
				if (session.usuario) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(token.user as any).usuario.avatar = session.usuario.avatar;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(token.user as any).usuario.permissao = session.usuario.permissao;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(token.user as any).usuario.nomeSocial = session.usuario.nomeSocial;
					return token;
				}
			}
			if (user) {
				token.user = user;
				return token;
			}

			// Refresh do access_token antes que expire — precisa ser aqui no jwt callback
			// para que os novos tokens sejam persistidos no cookie JWT.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const userSession = token.user as any;
			if (!userSession?.access_token || !userSession?.refresh_token) {
				return token;
			}

			try {
				const decoded = jwtDecode<{ exp: number }>(userSession.access_token);
				if (decoded.exp * 1000 > Date.now()) {
					return token; // token ainda válido
				}
			} catch {
				return token;
			}

			// access_token expirado — valida o refresh token e reemite (in-process).
			try {
				const sub = await verifyRefreshToken(userSession.refresh_token);
				if (sub) {
					const usuario = await prisma.usuario.findUnique({ where: { id: sub } });
					if (usuario && usuario.status !== false) {
						const { access_token, refresh_token } = await getTokens(usuario);
						userSession.access_token = access_token;
						userSession.refresh_token = refresh_token;
						userSession.usuario = jwtDecode(access_token);
						await atualizarUltimoLogin(usuario.id);
					}
				}
			} catch {
				// erro — tenta novamente na próxima requisição
			}

			return token;
		},
		async session({ session, token }) {
			try {
				//eslint-disable-next-line @typescript-eslint/no-explicit-any
				const userSession = token.user as any;
				if (!userSession) {
					return session;
				}
				session = userSession;

				if (session.access_token && !session.usuario) {
					try {
						session.usuario = jwtDecode(session.access_token);
					} catch {
						return session;
					}
				}

				return session;
			} catch {
				return session;
			}
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
} satisfies NextAuthConfig;
