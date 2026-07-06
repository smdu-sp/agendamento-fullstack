/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';

export async function buscarPorId(id: string): Promise<IRespostaUsuario> {
	if (!id || id === '') {
		return { ok: false, error: 'Não foi possível buscar o usuário, ID vazio.', data: null, status: 400 };
	}
	try {
		const logado = await requireUsuario();
		verificarPermissoes(logado, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const usuario = await prisma.usuario.findUnique({
			where: { id },
			select: SELECT_USUARIO_SEM_SENHA,
		});
		if (!usuario) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 404 };
		}

		// Ponto Focal e Coordenador só podem acessar usuários da sua divisão.
		if (
			(logado.permissao === 'PONTO_FOCAL' || logado.permissao === 'COORDENADOR') &&
			usuario.divisaoId !== logado.divisaoId
		) {
			throw new AuthzError('Você só pode acessar usuários da sua divisão.', 403);
		}

		return { ok: true, error: null, data: usuario as unknown as IUsuario, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar o usuário:' + error, data: null, status: 400 };
	}
}
