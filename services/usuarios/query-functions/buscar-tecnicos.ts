/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { IRespostaUsuario, IUsuarioTecnico } from '@/types/usuario';

export async function buscarTecnicos(): Promise<IRespostaUsuario> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const tecnicos = await prisma.usuario.findMany({
			where: {
				status: true,
				OR: [{ permissao: 'TEC' }, { permissao: 'DEV', divisaoId: { not: null } }],
			},
			orderBy: { nome: 'asc' },
			select: { id: true, nome: true },
		});
		return { ok: true, error: null, data: tecnicos as IUsuarioTecnico[], status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Não foi possível buscar o técnico:' + error, data: null, status: 400 };
	}
}
