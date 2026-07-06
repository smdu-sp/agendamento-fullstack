/** @format */

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { $Enums } from '@prisma/client';
import { IRespostaUsuario, IUpdateUsuario, IUsuario } from '@/types/usuario';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import {
	normalizarPermissao,
	validaPermissaoCriador,
	obterDivisaoArthurSaboyaId,
} from '@/lib/usuarios-core';

export async function atualizar(id: string, data: IUpdateUsuario): Promise<IRespostaUsuario> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV', 'TEC', 'PONTO_FOCAL', 'COORDENADOR']);

		// O backend recarrega o usuário logado do banco, usando a permissão REAL
		// (a personificação não afeta a lógica de negócio da atualização).
		const permissaoLogadoReal = (logado.permissaoReal ?? logado.permissao) as $Enums.Permissao;
		const divisaoIdLogado = logado.divisaoId;

		// Observação: IUpdateUsuario (contrato do frontend) não carrega login/nome/email —
		// só nomeSocial/avatar/status/permissao/divisaoId são editáveis. Por isso o check
		// de login duplicado do backend não se aplica aqui.

		const usuarioAntes = await prisma.usuario.findUnique({ where: { id } });
		if (!usuarioAntes) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 404 };
		}

		// Ponto Focal e Coordenador só podem editar usuários da sua divisão.
		if (permissaoLogadoReal === 'PONTO_FOCAL' || permissaoLogadoReal === 'COORDENADOR') {
			if (usuarioAntes.divisaoId !== divisaoIdLogado) {
				throw new AuthzError('Você só pode editar usuários da sua divisão.', 403);
			}
		}
		if (usuarioAntes.permissao === 'TEC' && id !== usuarioAntes.id) {
			throw new AuthzError('Operação não autorizada para este usuário.', 403);
		}

		// `id` no payload é ignorado (a atualização usa o `id` do parâmetro).
		const { permissao: permissaoDto, divisaoId: divisaoDto, id: _idIgnorado, ...rest } = data;
		void _idIgnorado;

		// Ponto Focal e Coordenador não podem alterar a divisão do usuário.
		let divisaoIdFinal =
			permissaoLogadoReal === 'PONTO_FOCAL' || permissaoLogadoReal === 'COORDENADOR'
				? usuarioAntes.divisaoId
				: divisaoDto !== undefined
					? divisaoDto
					: usuarioAntes.divisaoId;

		const permissaoBase =
			normalizarPermissao(permissaoDto) ?? normalizarPermissao(usuarioAntes.permissao);
		const permissaoValida = permissaoBase
			? validaPermissaoCriador(permissaoBase, permissaoLogadoReal)
			: $Enums.Permissao.PORTARIA;
		if (permissaoValida === 'ARTHUR_SABOYA') {
			divisaoIdFinal = await obterDivisaoArthurSaboyaId();
		}

		await prisma.usuario.update({
			data: {
				...rest,
				permissao: permissaoValida,
				divisaoId: divisaoIdFinal,
			},
			where: { id },
		});

		const atualizado = await prisma.usuario.findUnique({
			where: { id },
			select: SELECT_USUARIO_SEM_SENHA,
		});

		revalidateTag('users');
		revalidateTag('user-by-id');
		revalidatePath('/');
		return { ok: true, error: null, data: atualizado as unknown as IUsuario, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		console.log(error);
		return { ok: false, error: 'Erro ao atualizar usuário.', data: null, status: 500 };
	}
}
