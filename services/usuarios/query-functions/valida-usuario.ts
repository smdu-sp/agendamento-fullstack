/** @format */

'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';
import { redirect } from 'next/navigation';

/** Monta um IUsuario mínimo a partir do JWT da sessão (quando o banco não responde). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function usuarioFallbackDaSessao(session: any): IUsuario | null {
	const u = session.usuario as Record<string, unknown> | null | undefined;
	if (!u) return null;
	const sub = u.sub;
	const permissao = u.permissao;
	if (sub == null || permissao == null || permissao === '') return null;
	return {
		id: String(sub),
		nome: String(u.nome ?? ''),
		login: String(u.login ?? ''),
		email: String(u.email ?? ''),
		permissao: permissao as IUsuario['permissao'],
		status: Boolean(u.status),
		ultimoLogin: new Date(),
		criadoEm: new Date(),
		atualizadoEm: new Date(),
		avatar: u.avatar != null ? String(u.avatar) : undefined,
		nomeSocial: u.nomeSocial != null ? String(u.nomeSocial) : undefined,
	};
}

export async function validaUsuario(): Promise<IRespostaUsuario> {
	const session = await auth();
	if (!session) redirect('/login');

	const id = session.usuario?.sub;
	const fallback = usuarioFallbackDaSessao(session);

	try {
		if (!id) {
			return { ok: false, error: 'Sessão sem identificador de usuário.', data: null, status: 401 };
		}
		const usuario = await prisma.usuario.findUnique({
			where: { id },
			select: SELECT_USUARIO_SEM_SENHA,
		});
		if (!usuario) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 403 };
		}
		if (usuario.status !== true) {
			return { ok: false, error: 'Usuário inativo.', data: null, status: 403 };
		}
		return { ok: true, error: null, data: usuario as unknown as IUsuario, status: 200 };
	} catch (error) {
		// Banco indisponível: mantém o menu funcionando com os dados do token.
		if (fallback) {
			if (process.env.NODE_ENV === 'development') {
				console.warn('[validaUsuario] Banco indisponível; usando dados do token da sessão.', error);
			}
			return { ok: true, error: null, data: fallback, status: 200 };
		}
		return { ok: false, error: String(error), data: null, status: 500 };
	}
}
