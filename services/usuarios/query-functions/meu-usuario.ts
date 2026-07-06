/** @format */

'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import { IRespostaUsuario, IUsuario } from '@/types/usuario';

// Porta do endpoint `eu`: retorna o registro do próprio usuário logado, sem
// restrição de divisão. Lê a sessão internamente (o antigo access_token não é
// mais necessário).
export async function buscarMeuUsuario(): Promise<IRespostaUsuario> {
	const session = await auth();
	const id = session?.usuario?.sub;
	if (!id) {
		return { ok: false, error: 'Não foi possível buscar o usuário, sessão inválida.', data: null, status: 400 };
	}
	try {
		const usuario = await prisma.usuario.findUnique({
			where: { id },
			select: SELECT_USUARIO_SEM_SENHA,
		});
		if (!usuario) {
			return { ok: false, error: 'Usuário não encontrado.', data: null, status: 404 };
		}
		return { ok: true, error: null, data: usuario as unknown as IUsuario, status: 200 };
	} catch (error) {
		return { ok: false, error: 'Não foi possível buscar o usuário:' + error, data: null, status: 400 };
	}
}
