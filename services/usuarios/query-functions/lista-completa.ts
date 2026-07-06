/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';

export async function listaCompleta(): Promise<IRespostaUsuario> {
	try {
		const logado = await requireUsuario();
		verificarPermissoes(logado, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		// Ponto Focal e Coordenador só veem usuários da própria divisão.
		const where =
			(logado.permissao === 'PONTO_FOCAL' || logado.permissao === 'COORDENADOR') && logado.divisaoId
				? { divisaoId: logado.divisaoId }
				: {};

		const lista = await prisma.usuario.findMany({
			where,
			select: SELECT_USUARIO_SEM_SENHA,
			orderBy: { nome: 'asc' },
		});

		return { ok: true, error: null, data: lista as unknown as IUsuario[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de usuários:' + error,
			data: null,
			status: 500,
		};
	}
}
