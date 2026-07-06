/** @format */

'use server';

import { Client as LdapClient } from 'ldapts';
import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { INovoUsuario, IRespostaUsuario } from '@/types/usuario';

/**
 * Porta de UsuariosService.buscarNovo: procura um login ainda não cadastrado no
 * LDAP para pré-preencher o formulário de novo usuário. Se já existir e estiver
 * inativo, reativa. Se já existir e estiver ativo, erro.
 */
export async function buscarNovo(login: string): Promise<IRespostaUsuario> {
	if (!login || login === '') {
		return { ok: false, error: 'Não foi possível buscar o usuário, login vazio.', data: null, status: 400 };
	}

	try {
		const logado = await requireUsuario();
		verificarPermissoes(logado, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const existente = await prisma.usuario.findUnique({ where: { login } });
		if (existente && existente.status === true) {
			return { ok: false, error: 'Login já cadastrado.', data: null, status: 403 };
		}
		if (existente && existente.status !== true) {
			const reativado = await prisma.usuario.update({
				where: { id: existente.id },
				data: { status: true },
			});
			return {
				ok: true,
				error: null,
				data: { login: reativado.login, nome: reativado.nome, email: reativado.email } as INovoUsuario,
				status: 200,
			};
		}

		const ldapBase = process.env.LDAP_BASE_DN || process.env.LDAP_BASE;
		if (!ldapBase) {
			return { ok: false, error: 'LDAP_BASE_DN não configurado no ambiente.', data: null, status: 500 };
		}

		const client = new LdapClient({ url: process.env.LDAP_SERVER as string });
		let nome: string | undefined;
		let email: string | undefined;
		try {
			await client.bind(
				`${process.env.USER_LDAP}${process.env.LDAP_DOMAIN}`,
				process.env.PASS_LDAP as string,
			);
			const resultado = await client.search(ldapBase, {
				filter: `(&(sAMAccountName=${login})(company=SMUL))`,
				scope: 'sub',
				attributes: ['name', 'mail', 'sAMAccountName'],
			});
			if (!resultado.searchEntries || resultado.searchEntries.length === 0) {
				return { ok: false, error: 'Usuário não encontrado no LDAP.', data: null, status: 404 };
			}
			const { name, mail } = resultado.searchEntries[0];
			if (!name || !mail) {
				return { ok: false, error: 'Dados do usuário incompletos no LDAP.', data: null, status: 404 };
			}
			nome = name.toString();
			email = mail.toString().toLowerCase();
		} catch (error) {
			console.error('Erro ao buscar usuário no LDAP:', error);
			return { ok: false, error: 'Não foi possível buscar o usuário no LDAP.', data: null, status: 500 };
		} finally {
			try {
				await client.unbind();
			} catch {
				// Ignora erro ao fechar.
			}
		}

		if (!nome || !email) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 404 };
		}
		return { ok: true, error: null, data: { login, nome, email } as INovoUsuario, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		const errorMessage = error instanceof Error ? error.message : String(error);
		return { ok: false, error: `Erro de conexão: ${errorMessage}`, data: null, status: 400 };
	}
}
