/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario, verificarPermissoes, AuthzError } from '@/lib/authz';
import { verificaPagina, verificaLimite } from '@/lib/paginacao';
import { SELECT_USUARIO_SEM_SENHA } from '@/lib/usuario-select';
import { IPaginadoUsuario, IRespostaUsuario, IUsuario } from '@/types/usuario';
import { $Enums, type Prisma } from '@prisma/client';

export async function buscarTudo(
	pagina: number = 1,
	limite: number = 10,
	busca: string = '',
	status: string = '',
	permissao: string = '',
): Promise<IRespostaUsuario> {
	try {
		const usuario = await requireUsuario();
		verificarPermissoes(usuario, ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR']);

		[pagina, limite] = verificaPagina(pagina, limite);
		const isPontoFocalOuCoordenador =
			usuario.permissao === 'PONTO_FOCAL' || usuario.permissao === 'COORDENADOR';
		const permissaoFiltro =
			permissao && permissao !== '' ? $Enums.Permissao[permissao as keyof typeof $Enums.Permissao] : undefined;

		const where: Prisma.UsuarioWhereInput = {
			...(isPontoFocalOuCoordenador && usuario.divisaoId && { divisaoId: usuario.divisaoId }),
			...(busca && {
				OR: [
					{ nome: { contains: busca } },
					{ nomeSocial: { contains: busca } },
					{ login: { contains: busca } },
					{ email: { contains: busca } },
				],
			}),
			...(status &&
				status !== '' && {
					status: status === 'ATIVO' ? true : status === 'INATIVO' ? false : undefined,
				}),
			...(permissaoFiltro && { permissao: permissaoFiltro }),
		};

		const total = await prisma.usuario.count({ where });
		if (total === 0) {
			return { ok: true, error: null, data: { total: 0, pagina: 0, limite: 0, data: [] }, status: 200 };
		}
		[pagina, limite] = verificaLimite(pagina, limite, total);
		const usuarios = await prisma.usuario.findMany({
			where,
			orderBy: { nome: 'asc' },
			skip: (pagina - 1) * limite,
			take: limite,
			select: SELECT_USUARIO_SEM_SENHA,
		});

		const data: IPaginadoUsuario = {
			total,
			pagina,
			limite,
			data: usuarios as unknown as IUsuario[],
		};
		return { ok: true, error: null, data, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return {
			ok: false,
			error: 'Não foi possível buscar a lista de usuários:' + error,
			data: null,
			status: 400,
		};
	}
}
