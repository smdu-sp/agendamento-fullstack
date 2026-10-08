/** @format */

'use server';

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { IRespostaMunicipe } from '@/types/municipe';

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar o repasse ao munícipe.
const ALFABETO_SENHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TAMANHO_SENHA = 10;

function gerarSenhaTemporaria(): string {
	const bytes = randomBytes(TAMANHO_SENHA);
	return Array.from(bytes, (b) => ALFABETO_SENHA[b % ALFABETO_SENHA.length]).join('');
}

/**
 * Troca a senha do munícipe por uma senha temporária aleatória, devolvida uma
 * única vez para o administrador repassar. Links de redefinição pendentes são
 * invalidados.
 */
export async function resetarSenha(id: string): Promise<IRespostaMunicipe> {
	const logado = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(logado, ['ADM', 'DEV']);

		const alvo = await prisma.municipeConta.findUnique({ where: { id }, select: { id: true } });
		if (!alvo) {
			return { ok: false, error: 'Munícipe não encontrado.', data: null, status: 404 };
		}

		const senhaTemporaria = gerarSenhaTemporaria();
		const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

		await prisma.$transaction([
			prisma.municipeConta.update({ where: { id }, data: { senhaHash } }),
			prisma.municipeTokenRedefinicaoSenha.deleteMany({ where: { contaId: id, utilizadoEm: null } }),
		]);

		return { ok: true, error: null, data: { senhaTemporaria }, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		return { ok: false, error: 'Erro ao resetar a senha do munícipe.', data: null, status: 500 };
	}
}
