/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { $Enums } from '@prisma/client';
import { ICreateUsuario, IRespostaUsuario, IUsuario } from '@/types/usuario';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import {
	normalizarPermissao,
	validaPermissaoCriador,
	obterDivisaoArthurSaboyaId,
	inferirDivisaoIdPorLoginNoSgu,
} from '@/lib/usuarios-core';

export async function criar(data: ICreateUsuario): Promise<IRespostaUsuario> {
	// Usa a permissão EFETIVA (personificada), igual ao backend, que lê request.user.
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const loginExistente = await prisma.usuario.findUnique({ where: { login: data.login } });
		const emailExistente = await prisma.usuario.findUnique({ where: { email: data.email } });
		const jaCadastrado = !!loginExistente || !!emailExistente;
		if (jaCadastrado) {
			const isPontoFocalOuCoordenador =
				logado.permissao === 'PONTO_FOCAL' || logado.permissao === 'COORDENADOR';
			if (isPontoFocalOuCoordenador) {
				return {
					ok: false,
					error:
						'Já existe cadastro para este usuário. Contate um administrador para alterar a divisão desta pessoa.',
					data: null,
					status: 403,
				};
			}
			if (loginExistente) {
				return { ok: false, error: 'Login já cadastrado.', data: null, status: 403 };
			}
			return { ok: false, error: 'Email já cadastrado.', data: null, status: 403 };
		}

		const permissaoSolicitada =
			normalizarPermissao(data.permissao) ?? $Enums.Permissao.PORTARIA;
		const permissao = validaPermissaoCriador(permissaoSolicitada, logado.permissao);

		// Ponto Focal e Coordenador só podem criar usuários na sua divisão.
		let divisaoId = data.divisaoId;
		if (logado.permissao === 'PONTO_FOCAL' || logado.permissao === 'COORDENADOR') {
			if (!logado.divisaoId) {
				return {
					ok: false,
					error: 'Usuário sem divisão atribuída não pode criar usuários.',
					data: null,
					status: 403,
				};
			}
			divisaoId = logado.divisaoId;
		} else if (
			permissao === 'ARTHUR_SABOYA' ||
			permissao === 'ADM_ARTHUR_SABOYA'
		) {
			divisaoId = await obterDivisaoArthurSaboyaId();
		} else if (!divisaoId && permissao === 'TEC') {
			divisaoId = await inferirDivisaoIdPorLoginNoSgu(data.login);
		}

		const usuario = await prisma.usuario.create({
			data: {
				nome: data.nome,
				login: data.login,
				email: data.email,
				nomeSocial: data.nomeSocial,
				avatar: data.avatar,
				status: data.status,
				permissao,
				divisaoId,
			},
			select: SELECT_USUARIO_SEM_SENHA,
		});

		revalidateTag('users');
		return { ok: true, error: null, data: usuario as unknown as IUsuario, status: 201 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao criar novo usuário.', data: null, status: 500 };
	}
}
