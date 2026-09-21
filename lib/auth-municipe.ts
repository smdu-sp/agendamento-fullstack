import "server-only";

import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { AuthzError, type MunicipePayload } from "@/lib/authz";

export async function getMunicipeFromToken(token: string): Promise<MunicipePayload | null> {
	const raw = token.trim();
	if (!raw) return null;
	try {
		const secret = new TextEncoder().encode(process.env.JWT_SECRET);
		const { payload } = await jwtVerify(raw, secret);
		if (payload.escopo !== "MUNICIPE" || !payload.sub || !payload.email) return null;
		return {
			id: String(payload.sub),
			email: String(payload.email).trim().toLowerCase(),
			nome: typeof payload.nome === "string" ? payload.nome : undefined,
		};
	} catch {
		return null;
	}
}

export async function requireMunicipeFromToken(token: string): Promise<{
	id: string;
	email: string;
	nome: string;
}> {
	const payload = await getMunicipeFromToken(token);
	if (!payload) throw new AuthzError("Não autenticado.", 401);

	const conta = await prisma.municipeConta.findUnique({
		where: { id: payload.id },
		select: { id: true, email: true, nome: true, status: true },
	});
	if (!conta || !conta.status) {
		throw new AuthzError("Conta de munícipe inválida ou inativa.", 401);
	}
	return {
		id: conta.id,
		email: conta.email,
		nome: conta.nome,
	};
}
