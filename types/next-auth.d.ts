/** @format */

import NextAuth from 'next-auth';

declare module 'next-auth' {
	interface Session {
		id: string;
		usuario: {
			sub: string;
			nome: string;
			nomeSocial?: string;
			login: string;
			email: string;
			permissao: string;
			status: number;
			avatar?: string;
			iat: number;
			exp: number;
		};
		access_token: string;
		refresh_token: string;
	}
}
import NextAuth, { type DefaultSession } from 'next-auth';
