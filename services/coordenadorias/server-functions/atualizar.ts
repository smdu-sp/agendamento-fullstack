/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IUpdateCoordenadoria, ICoordenadoria, IRespostaCoordenadoria } from '@/types/coordenadoria';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';

export async function atualizar(
	id: string,
	data: IUpdateCoordenadoria,
): Promise<IRespostaCoordenadoria> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const isPontoFocalOuCoordenador =
			usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
		const coordenadoriaIdUsuario = usuario.divisao?.coordenadoriaId;
		if (isPontoFocalOuCoordenador && coordenadoriaIdUsuario && coordenadoriaIdUsuario !== id) {
			throw new AuthzError('Você só pode editar a coordenadoria à qual está vinculado.', 403);
		}

		if (data.sigla) {
			const existente = await prisma.coordenadoria.findUnique({ where: { sigla: data.sigla } });
			if (existente && existente.id !== id) {
				return { ok: false, error: 'Sigla já cadastrada.', data: null, status: 403 };
			}
		}

		const coordenadoriaAtualizada = await prisma.coordenadoria.update({
			data,
			where: { id },
		});

		revalidateTag('coordenadorias');
		return { ok: true, error: null, data: coordenadoriaAtualizada as ICoordenadoria, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao atualizar coordenadoria.', data: null, status: 500 };
	}
}
