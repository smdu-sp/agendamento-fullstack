/** @format */

import { getApiUrl } from "@/lib/api-url";
import { getAuthHeaders } from "@/lib/api-headers";
import type { IRespostaSolicitacoesPreProjetoArthurSaboya } from "@/types/solicitacao-pre-projeto-arthur-saboya";

export async function buscarSolicitacoesPortalArthurSaboya(
  access_token: string,
  pagina: number = 1,
  limite: number = 10,
  busca: string = "",
  statusFiltro: "" | "SOLICITADO" | "AGUARDANDO_DATA" | "RESPONDIDO" | "AGENDAMENTO_CRIADO" = "",
): Promise<IRespostaSolicitacoesPreProjetoArthurSaboya> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada (NEXT_PUBLIC_API_URL / INTERNAL_API_URL).",
      data: null,
      status: 400,
    };
  }
  try {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(busca.trim() ? { busca: busca.trim() } : {}),
      ...(statusFiltro ? { status: statusFiltro } : {}),
    });
    const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/buscar-tudo?${params}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(access_token),
      },
      cache: "no-store",
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return {
        ok: false,
        error: `Resposta inválida da API (status ${res.status}).`,
        data: null,
        status: res.status || 400,
      };
    }
    if (res.status === 200) {
      return {
        ok: true,
        error: null,
        data: body as IRespostaSolicitacoesPreProjetoArthurSaboya["data"],
        status: 200,
      };
    }
    const msg =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Erro ${res.status}`;
    return {
      ok: false,
      error: msg,
      data: null,
      status: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        "Não foi possível carregar os pedidos: " +
        (error instanceof Error ? error.message : String(error)),
      data: null,
      status: 400,
    };
  }
}
