/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { emailTemEstruturaValida } from '@/lib/utils';
import { IRespostaMunicipe, IUpdateMunicipe } from '@/types/municipe';

export async function atualizar(id: string, dados: IUpdateMunicipe): Promise<IRespostaMunicipe> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV']);

		const nome = dados.nome?.trim();
		const email = dados.email?.trim().toLowerCase();
		if (dados.nome !== undefined && !nome) {
			return { ok: false, error: 'Informe o nome completo.', data: null, status: 400 };
		}
		if (email !== undefined && !emailTemEstruturaValida(email)) {
			return { ok: false, error: 'Informe um e-mail válido no formato nome@dominio.com.', data: null, status: 400 };
		}

		const alvo = await prisma.municipeConta.findUnique({ where: { id }, select: { id: true } });
		if (!alvo) {
			return { ok: false, error: 'Munícipe não encontrado.', data: null, status: 404 };
		}

		if (email) {
			const existente = await prisma.municipeConta.findUnique({ where: { email }, select: { id: true } });
			if (existente && existente.id !== id) {
				return { ok: false, error: 'Já existe uma conta com este e-mail.', data: null, status: 409 };
			}
		}

		await prisma.municipeConta.update({
			where: { id },
			data: { ...(nome && { nome }), ...(email && { email }) },
		});

		return { ok: true, error: null, data: null, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao atualizar munícipe.', data: null, status: 500 };
	}
}
