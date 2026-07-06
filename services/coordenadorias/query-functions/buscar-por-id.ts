/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { ICoordenadoria, IRespostaCoordenadoria } from '@/types/coordenadoria';

export async function buscarPorId(id: string): Promise<IRespostaCoordenadoria> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		const isPontoFocalOuCoordenador =
			usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
		const coordenadoriaIdUsuario = usuario.divisao?.coordenadoriaId;
		if (isPontoFocalOuCoordenador && coordenadoriaIdUsuario && coordenadoriaIdUsuario !== id) {
			throw new AuthzError('Você só pode acessar a coordenadoria à qual está vinculado.', 403);
		}

		const coordenadoria = await prisma.coordenadoria.findUnique({ where: { id } });
		if (!coordenadoria) {
			return { ok: false, error: 'Coordenadoria não encontrada.', data: null, status: 404 };
		}

		return { ok: true, error: null, data: coordenadoria as ICoordenadoria, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a coordenadoria:' + error,
			data: null,
			status: 400,
		};
	}
}
