import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { emailTemEstruturaValida } from "@/lib/utils";

export class MunicipeAuthError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

const encoder = new TextEncoder();
const MENSAGEM_EMAIL_INVALIDO = "Informe um e-mail válido no formato nome@dominio.com.";
const SENHA_MINIMA = 6;
const RESET_EXPIRA_MINUTOS = 60;

function normalizarEmail(email: string): string {
	return email.trim().toLowerCase();
}

function exigirEmailValido(email: string): string {
	const valor = normalizarEmail(email);
	if (!emailTemEstruturaValida(valor)) {
		throw new MunicipeAuthError(MENSAGEM_EMAIL_INVALIDO, 400);
	}
	return valor;
}

async function emitirTokenMunicipe(conta: {
	id: string;
	email: string;
	nome: string;
}): Promise<string> {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new MunicipeAuthError("JWT_SECRET não configurado.", 500);

	return new SignJWT({
		sub: conta.id,
		email: conta.email,
		nome: conta.nome,
		escopo: "MUNICIPE",
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(encoder.encode(secret));
}

export async function cadastrarMunicipe(body: {
	nome?: unknown;
	email?: unknown;
	senha?: unknown;
}): Promise<{ access_token: string }> {
	const nome = typeof body.nome === "string" ? body.nome.trim() : "";
	const senha = typeof body.senha === "string" ? body.senha : "";
	if (!nome) throw new MunicipeAuthError("Informe o nome completo.", 400);
	if (senha.length < SENHA_MINIMA) {
		throw new MunicipeAuthError(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`, 400);
	}
	if (typeof body.email !== "string") {
		throw new MunicipeAuthError(MENSAGEM_EMAIL_INVALIDO, 400);
	}
	const email = exigirEmailValido(body.email);

	const existente = await prisma.municipeConta.findUnique({ where: { email } });
	if (existente) {
		throw new MunicipeAuthError("Já existe uma conta com este e-mail.", 409);
	}

	const senhaHash = await bcrypt.hash(senha, 10);
	const conta = await prisma.municipeConta.create({
		data: {
			nome,
			email,
			senhaHash,
			ultimoLogin: new Date(),
		},
		select: { id: true, email: true, nome: true },
	});

	return { access_token: await emitirTokenMunicipe(conta) };
}

export async function loginMunicipe(body: {
	email?: unknown;
	senha?: unknown;
}): Promise<{ access_token: string }> {
	const senha = typeof body.senha === "string" ? body.senha : "";
	if (typeof body.email !== "string" || !senha) {
		throw new MunicipeAuthError("E-mail ou senha inválidos.", 401);
	}
	const email = normalizarEmail(body.email);

	const conta = await prisma.municipeConta.findUnique({
		where: { email },
		select: { id: true, email: true, nome: true, senhaHash: true, status: true },
	});
	if (!conta || !conta.status) {
		throw new MunicipeAuthError("E-mail ou senha inválidos.", 401);
	}

	const ok = await bcrypt.compare(senha, conta.senhaHash);
	if (!ok) throw new MunicipeAuthError("E-mail ou senha inválidos.", 401);

	await prisma.municipeConta.update({
		where: { id: conta.id },
		data: { ultimoLogin: new Date() },
	});

	return { access_token: await emitirTokenMunicipe(conta) };
}

function hashTokenRedefinicao(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function urlRedefinicao(token: string): string {
	const base = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
	const path = `/portal/redefinir-senha?token=${encodeURIComponent(token)}`;
	return base ? `${base}${path}` : path;
}

export async function solicitarRedefinicaoSenhaMunicipe(body: {
	email?: unknown;
}): Promise<{ mensagem: string; linkRedefinicao?: string }> {
	const mensagem =
		"Se o e-mail estiver cadastrado, enviaremos o link para redefinir a senha.";
	if (typeof body.email !== "string") return { mensagem };

	const email = normalizarEmail(body.email);
	if (!emailTemEstruturaValida(email)) return { mensagem };

	const conta = await prisma.municipeConta.findUnique({
		where: { email },
		select: { id: true, status: true },
	});
	if (!conta || !conta.status) return { mensagem };

	const token = randomBytes(32).toString("hex");
	const expiraEm = new Date(Date.now() + RESET_EXPIRA_MINUTOS * 60 * 1000);

	await prisma.municipeTokenRedefinicaoSenha.deleteMany({
		where: { contaId: conta.id, utilizadoEm: null },
	});
	await prisma.municipeTokenRedefinicaoSenha.create({
		data: {
			contaId: conta.id,
			tokenHash: hashTokenRedefinicao(token),
			expiraEm,
		},
	});

	const ambienteLocal = process.env.ENVIRONMENT === "local" || process.env.NODE_ENV !== "production";
	return ambienteLocal ? { mensagem, linkRedefinicao: urlRedefinicao(token) } : { mensagem };
}

export async function redefinirSenhaMunicipe(body: {
	token?: unknown;
	novaSenha?: unknown;
}): Promise<{ mensagem: string }> {
	const token = typeof body.token === "string" ? body.token.trim() : "";
	const novaSenha = typeof body.novaSenha === "string" ? body.novaSenha : "";
	if (!token) throw new MunicipeAuthError("Informe o token de redefinição.", 400);
	if (novaSenha.length < SENHA_MINIMA) {
		throw new MunicipeAuthError(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`, 400);
	}

	const registro = await prisma.municipeTokenRedefinicaoSenha.findFirst({
		where: {
			tokenHash: hashTokenRedefinicao(token),
			utilizadoEm: null,
			expiraEm: { gt: new Date() },
		},
		select: { id: true, contaId: true },
	});
	if (!registro) {
		throw new MunicipeAuthError("Token de redefinição inválido ou expirado.", 400);
	}

	const senhaHash = await bcrypt.hash(novaSenha, 10);
	await prisma.$transaction([
		prisma.municipeConta.update({
			where: { id: registro.contaId },
			data: { senhaHash },
		}),
		prisma.municipeTokenRedefinicaoSenha.update({
			where: { id: registro.id },
			data: { utilizadoEm: new Date() },
		}),
	]);

	return { mensagem: "Senha redefinida com sucesso." };
}
