/** @format */

import { getApiUrl } from "@/lib/api-url";
import { getAuthHeaders } from "@/lib/api-headers";
import type { ISolicitacaoPreProjetoArthurSaboyaDetalhe } from "@/types/solicitacao-pre-projeto-arthur-saboya";

export interface IRespostaDetalheChamadoPortal {
  ok: boolean;
  error: string | null;
  data: ISolicitacaoPreProjetoArthurSaboyaDetalhe | null;
  status: number;
}

export async function obterChamadoPortalArthurSaboya(
  access_token: string,
  id: string,
): Promise<IRespostaDetalheChamadoPortal> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(id);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}`;
  try {
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
        error: `Resposta inválida (status ${res.status}).`,
        data: null,
        status: res.status || 400,
      };
    }
    if (res.status === 200) {
      return {
        ok: true,
        error: null,
        data: body as ISolicitacaoPreProjetoArthurSaboyaDetalhe,
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
    return { ok: false, error: msg, data: null, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      data: null,
      status: 400,
    };
  }
}

export async function enviarMensagemChamadoPortalArthurSaboya(
  access_token: string,
  id: string,
  texto: string,
): Promise<IRespostaDetalheChamadoPortal> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(id);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}/mensagens`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(access_token),
      },
      body: JSON.stringify({ texto }),
      cache: "no-store",
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return {
        ok: false,
        error: `Resposta inválida (status ${res.status}).`,
        data: null,
        status: res.status || 400,
      };
    }
    if (res.status === 200 || res.status === 201) {
      return {
        ok: true,
        error: null,
        data: body as ISolicitacaoPreProjetoArthurSaboyaDetalhe,
        status: res.status,
      };
    }
    const msg =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Erro ${res.status}`;
    return { ok: false, error: msg, data: null, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      data: null,
      status: 400,
    };
  }
}
