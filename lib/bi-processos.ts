import "server-only";

import { createHash } from "node:crypto";
import sql from "mssql";
import { elegivelComuniqueSe, elegivelDespacho } from "@/lib/bi-elegibilidade";

type BiConfig = {
	server: string;
	port: number;
	user: string;
	password: string;
	database: string;
	options: { encrypt: boolean; trustServerCertificate: boolean };
};

function parseBiDatabaseUrl(url: string): BiConfig {
	const raw = url.trim().replace(/^sqlserver:\/\//i, "");
	const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
	let server: string | undefined;
	let port = 1433;
	const params: Record<string, string> = {};
	for (const p of parts) {
		const eq = p.indexOf("=");
		if (eq < 0) {
			const [host, portStr] = p.split(":");
			server = host;
			if (portStr) port = Number(portStr);
			continue;
		}
		params[p.slice(0, eq).toLowerCase()] = p.slice(eq + 1);
	}
	const user = params.user || params.uid;
	const password = params.password || params.pwd;
	const database = params.database;
	const host = server || params.server;
	if (!host || !user || !password || !database) {
		throw new Error("BI_DATABASE_URL incompleta.");
	}
	return {
		server: host,
		port: Number(params.port || port || 1433),
		user,
		password,
		database,
		options: {
			encrypt: String(params.encrypt ?? "true").toLowerCase() !== "false",
			trustServerCertificate:
				String(params.trustservercertificate ?? "true").toLowerCase() !== "false",
		},
	};
}

const globalForBi = globalThis as unknown as {
	biPool: sql.ConnectionPool | undefined;
	biPoolPromise: Promise<sql.ConnectionPool> | undefined;
};

async function getBiPool(): Promise<sql.ConnectionPool | null> {
	const url = process.env.BI_DATABASE_URL?.trim();
	if (!url) return null;
	if (globalForBi.biPool?.connected) return globalForBi.biPool;
	if (!globalForBi.biPoolPromise) {
		globalForBi.biPoolPromise = new sql.ConnectionPool(parseBiDatabaseUrl(url))
			.connect()
			.then((pool) => {
				globalForBi.biPool = pool;
				return pool;
			})
			.catch((err: unknown) => {
				globalForBi.biPoolPromise = undefined;
				throw err;
			});
	}
	return globalForBi.biPoolPromise;
}

export type ResultadoBiProcesso = {
	encontrado: boolean;
	comuniqueSeAberto: boolean; // Nome legado: indica comunique-se elegível, independentemente da situação.
	indeferido: boolean;
	elegivelAutomatico: boolean;
	ocorrencias: OcorrenciaBi[];
	processo?: string | null;
	protocolo?: string | null;
	unidade?: string | null;
	situacaoComuniqueSe?: string | null;
	situacaoDespacho?: string | null;
	campoLocalizado?: "processo" | "protocolo";
	erroBi?: boolean;
};

export type OcorrenciaBi = {
	id: string;
	tipo: "COMUNIQUE_SE" | "DESPACHO";
	processo: string | null;
	protocolo: string | null;
	sistema: string | null;
	situacao: string | null;
	unidade: string | null;
	responsavel: string | null;
	responsavelRF: string | null;
	elegivel: boolean;
};

type LinhaBi = {
	processo: string | null;
	protocolo: string | null;
	sistema: string | null;
	situacao: string | null;
	unidade: string | null;
	responsavel: string | null;
	responsavelRF: string | null;
};

function normalizarNumero(valor: string): string {
	return valor.trim().replace(/\s+/g, " ");
}

function limpar(valor: string | null | undefined): string | null {
	return valor == null ? null : String(valor).trim() || null;
}

function montarOcorrencia(tipo: OcorrenciaBi["tipo"], row: LinhaBi): OcorrenciaBi {
	const processo = limpar(row.processo);
	const protocolo = limpar(row.protocolo);
	const sistema = limpar(row.sistema);
	const situacao = limpar(row.situacao);
	const unidade = limpar(row.unidade);
	const responsavel = limpar(row.responsavel);
	const responsavelRF = limpar(row.responsavelRF);
	// O contrato do BI ainda não informa uma chave primária para cada ocorrência.
	const id = createHash("sha256")
		.update(JSON.stringify([tipo, processo, protocolo, sistema, situacao, unidade, responsavel, responsavelRF]))
		.digest("hex");
	return {
		id, tipo, processo, protocolo, sistema, situacao, unidade, responsavel, responsavelRF,
		elegivel: tipo === "COMUNIQUE_SE" ? elegivelComuniqueSe(situacao) : elegivelDespacho(situacao),
	};
}

async function buscarOcorrencias(pool: sql.ConnectionPool, numero: string): Promise<OcorrenciaBi[]> {
	const [comuniques, despachos] = await Promise.all([
		pool.request().input("numero", sql.VarChar(80), numero).query<LinhaBi>(`
			SELECT processo, protocolo, sistema,
				situacaoComuniquese AS situacao, unidadeComuniquese AS unidade,
				responsavelComuniquese AS responsavel, responsavelComuniqueseID AS responsavelRF
			FROM dbo.prata_comuniquese
			WHERE LTRIM(RTRIM(CAST(processo AS VARCHAR(80)))) = @numero
			   OR LTRIM(RTRIM(CAST(protocolo AS VARCHAR(80)))) = @numero
		`),
		pool.request().input("numero", sql.VarChar(80), numero).query<LinhaBi>(`
			SELECT processo, protocolo, sistema,
				situacaoDespacho AS situacao, unidadeDespacho AS unidade,
				responsavelDespacho AS responsavel, responsavelDespachoID AS responsavelRF
			FROM dbo.prata_despacho
			WHERE LTRIM(RTRIM(CAST(processo AS VARCHAR(80)))) = @numero
			   OR LTRIM(RTRIM(CAST(protocolo AS VARCHAR(80)))) = @numero
		`),
	]);
	const todas = [
		...(comuniques.recordset ?? []).map((row) => montarOcorrencia("COMUNIQUE_SE", row)),
		...(despachos.recordset ?? []).map((row) => montarOcorrencia("DESPACHO", row)),
	];
	return [...new Map(todas.map((ocorrencia) => [ocorrencia.id, ocorrencia])).values()];
}

export async function consultarProcessoNoBi(numeroInformado: string): Promise<ResultadoBiProcesso> {
	const numero = normalizarNumero(numeroInformado);
	const vazio: ResultadoBiProcesso = {
		encontrado: false, comuniqueSeAberto: false, indeferido: false,
		elegivelAutomatico: false, ocorrencias: [],
	};
	if (!numero) return vazio;

	let pool: sql.ConnectionPool | null = null;
	try {
		pool = await getBiPool();
	} catch (err) {
		console.warn("[BI] Falha ao conectar:", (err as Error).message);
		return { ...vazio, erroBi: true };
	}
	if (!pool) return { ...vazio, erroBi: true };

	try {
		const ocorrencias = await buscarOcorrencias(pool, numero);
		const comunique = ocorrencias.find((o) => o.tipo === "COMUNIQUE_SE" && o.elegivel);
		const despacho = ocorrencias.find((o) => o.tipo === "DESPACHO" && o.elegivel);
		const ref = comunique ?? despacho ?? ocorrencias[0];

		return {
			encontrado: ocorrencias.length > 0,
			comuniqueSeAberto: !!comunique,
			indeferido: !!despacho,
			elegivelAutomatico: !!comunique || !!despacho,
			ocorrencias,
			processo: ref?.processo ?? null,
			protocolo: ref?.protocolo ?? null,
			unidade: ref?.unidade ?? null,
			situacaoComuniqueSe: comunique?.situacao ?? null,
			situacaoDespacho: despacho?.situacao ?? null,
			campoLocalizado: ocorrencias.some((o) => o.processo === numero) ? "processo" : ocorrencias.length ? "protocolo" : undefined,
		};
	} catch (err) {
		console.warn("[BI] Falha na consulta:", (err as Error).message);
		return { ...vazio, erroBi: true };
	}
}
