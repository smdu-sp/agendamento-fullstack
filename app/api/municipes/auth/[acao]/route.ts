import { NextResponse } from "next/server";
import {
	MunicipeAuthError,
	cadastrarMunicipe,
	loginMunicipe,
	redefinirSenhaMunicipe,
	solicitarRedefinicaoSenhaMunicipe,
} from "@/lib/municipes-auth-core";

export const dynamic = "force-dynamic";

type Acao = "cadastro" | "login" | "solicitar-redefinicao-senha" | "redefinir-senha";

function jsonErro(message: string, status: number) {
	return NextResponse.json({ message }, { status });
}

export async function POST(
	request: Request,
	context: { params: Promise<{ acao: string }> },
) {
	const { acao } = await context.params;
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonErro("Corpo da requisição inválido.", 400);
	}
	if (!body || typeof body !== "object") {
		return jsonErro("Corpo da requisição inválido.", 400);
	}

	try {
		switch (acao as Acao) {
			case "cadastro":
				return NextResponse.json(await cadastrarMunicipe(body));
			case "login":
				return NextResponse.json(await loginMunicipe(body));
			case "solicitar-redefinicao-senha":
				return NextResponse.json(await solicitarRedefinicaoSenhaMunicipe(body));
			case "redefinir-senha":
				return NextResponse.json(await redefinirSenhaMunicipe(body));
			default:
				return jsonErro("Rota não encontrada.", 404);
		}
	} catch (err) {
		if (err instanceof MunicipeAuthError) {
			return jsonErro(err.message, err.status);
		}
		console.error("[municipes/auth]", err);
		return jsonErro("Erro inesperado.", 500);
	}
}
