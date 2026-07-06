/** @format */

'use server';

import { prisma } from '@/lib/prisma';
import { requireUsuario } from '@/lib/authz';
import type { IUltimaImportacaoPlanilha } from '@/types/agendamento';

export async function getUltimaImportacaoPlanilha(): Promise<{
	ok: boolean;
	data: IUltimaImportacaoPlanilha | null;
	error?: string;
}> {
	try {
		await requireUsuario();
		const ultima = await prisma.logImportacaoPlanilha.findFirst({
			orderBy: { dataHora: 'desc' },
			include: { usuario: { select: { nome: true } } },
		});
		if (!ultima) return { ok: true, data: null };
		return {
			ok: true,
			data: {
				dataHora: ultima.dataHora.toISOString(),
				total: ultima.total,
				usuarioNome: ultima.usuario?.nome ?? null,
			},
		};
	} catch (error) {
		// P2021 = tabela não existe; retorna null para não quebrar a página.
		if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2021') {
			return { ok: true, data: null };
		}
		return {
			ok: false,
			data: null,
			error: error instanceof Error ? error.message : 'Erro ao buscar última importação',
		};
	}
}
