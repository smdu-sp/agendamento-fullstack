// A SguService original do backend usa o client principal do Prisma (não o
// client gerado a partir de prisma/sgu/schema.prisma) apontado para outra
// datasource, já que só faz consultas via $queryRaw (sem depender dos
// modelos tipados). Replicamos o mesmo comportamento aqui.
import { PrismaClient } from '@prisma/client';

const globalForSgu = globalThis as unknown as {
	prismaSgu: PrismaClient | undefined;
};

export const prismaSgu =
	globalForSgu.prismaSgu ??
	new PrismaClient(
		process.env.SGU_DATABASE_URL
			? { datasources: { db: { url: process.env.SGU_DATABASE_URL } } }
			: undefined,
	);

if (process.env.NODE_ENV !== 'production') globalForSgu.prismaSgu = prismaSgu;

// Banco legado: best-effort. Se estiver inacessível, apenas loga e segue —
// nenhuma funcionalidade do app depende dele para funcionar.
prismaSgu.$connect().catch((err: unknown) => {
	console.warn(
		'[prismaSgu] Banco SGU inacessível na inicialização:',
		(err as Error).message,
	);
});

/** `cpUsuarioRede` no SGU já segue o mesmo formato do login local (ex.: dXXXXXX). */
export async function buscarSiglaUnidadePorUsuarioRede(
	usuarioRede: string,
): Promise<string | null> {
	const login = String(usuarioRede || '')
		.trim()
		.toLowerCase();
	if (!login) return null;

	try {
		const rows = await prismaSgu.$queryRaw<Array<{ sigla: string | null }>>`
			SELECT un.sigla AS sigla
			FROM tblUsuarios u
			LEFT JOIN tblUnidades un ON un.cdUnid = u.cpUnid
			WHERE LOWER(TRIM(u.cpUsuarioRede)) = ${login}
			LIMIT 1
		`;
		const sigla = rows?.[0]?.sigla?.trim();
		return sigla || null;
	} catch {
		return null;
	}
}
