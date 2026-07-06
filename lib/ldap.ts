import 'server-only';

import { Client as LdapClient } from 'ldapts';

export type LdapUsuario = { login: string; nome: string; email: string };

/**
 * Busca um usuário no AD/LDAP por sAMAccountName (empresa SMUL).
 * Retorna null se não encontrado ou dados incompletos; lança em erro de
 * conexão/configuração. Espelha a busca usada em UsuariosService.buscarNovo.
 */
export async function buscarUsuarioLdapPorLogin(login: string): Promise<LdapUsuario | null> {
	const ldapBase = process.env.LDAP_BASE_DN || process.env.LDAP_BASE;
	if (!ldapBase) {
		throw new Error('LDAP_BASE_DN não configurado no ambiente.');
	}
	const client = new LdapClient({ url: process.env.LDAP_SERVER as string });
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
		if (!resultado.searchEntries || resultado.searchEntries.length === 0) return null;
		const { name, mail } = resultado.searchEntries[0];
		if (!name || !mail) return null;
		return { login, nome: name.toString(), email: mail.toString().toLowerCase() };
	} finally {
		try {
			await client.unbind();
		} catch {
			// Ignora erro ao fechar.
		}
	}
}
