import "server-only";

import sql from "mssql";

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
	comuniqueSeAberto: boolean;
	indeferido: boolean;
	elegivelAutomatico: boolean;
	processo?: string | null;
	protocolo?: string | null;
	unidade?: string | null;
	situacaoComuniqueSe?: string | null;
	situacaoDespacho?: string | null;
	campoLocalizado?: "processo" | "protocolo";
	erroBi?: boolean;
};

type LinhaComuniqueSe = {
	Processo: string | null;
	Protocolo: string | null;
	SituacaoComuniqueSe: string | null;
	UnidadeComuniquese: string | null;
	DtEmissao: Date | null;
};

type LinhaDespacho = {
	Processo: string | null;
	Protocolo: string | null;
	SituacaoDespacho: string | null;
	UnidadeDespacho: string | null;
	DtEmissao: Date | null;
};

const SITUACOES_COMUNIQUE_FECHADO = new Set(["concluido", "concluído", "fechado"]);

function normalizarNumero(valor: string): string {
	return valor.trim().replace(/\s+/g, " ");
}

function situacaoComuniqueAberta(situacao: string | null | undefined): boolean {
	const s = (situacao ?? "").trim().toLowerCase();
	if (!s) return false;
	return !SITUACOES_COMUNIQUE_FECHADO.has(s);
}

function situacaoIndeferida(situacao: string | null | undefined): boolean {
	const s = (situacao ?? "").trim().toLowerCase();
	return s.startsWith("indefer");
}

async function buscarPorCampo<T>(
	pool: sql.ConnectionPool,
	tabela: "ComuniqueSes" | "Despachos",
	campo: "Processo" | "Protocolo",
	numero: string,
): Promise<T[]> {
	const request = pool.request();
	request.input("numero", sql.VarChar(40), numero);
	const result = await request.query<T>(`
		SELECT Processo, Protocolo,
			${tabela === "ComuniqueSes" ? "SituacaoComuniqueSe, UnidadeComuniquese, DtEmissao" : "SituacaoDespacho, UnidadeDespacho, DtEmissao"}
		FROM dbo.${tabela}
		WHERE LTRIM(RTRIM(CAST(${campo} AS VARCHAR(40)))) = @numero
	`);
	return result.recordset ?? [];
}

export async function consultarProcessoNoBi(numeroInformado: string): Promise<ResultadoBiProcesso> {
	const numero = normalizarNumero(numeroInformado);
	if (!numero) {
		return {
			encontrado: false,
			comuniqueSeAberto: false,
			indeferido: false,
			elegivelAutomatico: false,
		};
	}

	let pool: sql.ConnectionPool | null = null;
	try {
		pool = await getBiPool();
	} catch (err) {
		console.warn("[BI] Falha ao conectar:", (err as Error).message);
		return {
			encontrado: false,
			comuniqueSeAberto: false,
			indeferido: false,
			elegivelAutomatico: false,
			erroBi: true,
		};
	}
	if (!pool) {
		return {
			encontrado: false,
			comuniqueSeAberto: false,
			indeferido: false,
			elegivelAutomatico: false,
			erroBi: true,
		};
	}

	try {
		let campoLocalizado: "processo" | "protocolo" | undefined;
		let comuniques = await buscarPorCampo<LinhaComuniqueSe>(pool, "ComuniqueSes", "Processo", numero);
		let despachos = await buscarPorCampo<LinhaDespacho>(pool, "Despachos", "Processo", numero);
		if (comuniques.length || despachos.length) {
			campoLocalizado = "processo";
		} else {
			comuniques = await buscarPorCampo<LinhaComuniqueSe>(pool, "ComuniqueSes", "Protocolo", numero);
			despachos = await buscarPorCampo<LinhaDespacho>(pool, "Despachos", "Protocolo", numero);
			if (comuniques.length || despachos.length) campoLocalizado = "protocolo";
		}

		if (!campoLocalizado) {
			return {
				encontrado: false,
				comuniqueSeAberto: false,
				indeferido: false,
				elegivelAutomatico: false,
			};
		}

		const abertos = comuniques
			.filter((c) => situacaoComuniqueAberta(c.SituacaoComuniqueSe))
			.sort((a, b) => (b.DtEmissao?.getTime() ?? 0) - (a.DtEmissao?.getTime() ?? 0));
		const indeferidos = despachos
			.filter((d) => situacaoIndeferida(d.SituacaoDespacho))
			.sort((a, b) => (b.DtEmissao?.getTime() ?? 0) - (a.DtEmissao?.getTime() ?? 0));

		const comuniqueSeAberto = abertos.length > 0;
		const indeferido = indeferidos.length > 0;
		const ref = abertos[0] ?? indeferidos[0] ?? comuniques[0] ?? despachos[0];
		const unidade = (abertos[0]?.UnidadeComuniquese ?? indeferidos[0]?.UnidadeDespacho ?? null)?.trim() || null;

		return {
			encontrado: true,
			comuniqueSeAberto,
			indeferido,
			elegivelAutomatico: comuniqueSeAberto || indeferido,
			processo: ref?.Processo?.trim() || null,
			protocolo: ref?.Protocolo?.trim() || null,
			unidade,
			situacaoComuniqueSe: abertos[0]?.SituacaoComuniqueSe?.trim() || null,
			situacaoDespacho: indeferidos[0]?.SituacaoDespacho?.trim() || null,
			campoLocalizado,
		};
	} catch (err) {
		console.warn("[BI] Falha na consulta:", (err as Error).message);
		return {
			encontrado: false,
			comuniqueSeAberto: false,
			indeferido: false,
			elegivelAutomatico: false,
			erroBi: true,
		};
	}
}
