/** @format */

import { getApiUrl } from "@/lib/api-url";
import { getAuthHeaders } from "@/lib/api-headers";
import type { ISolicitacaoPreProjetoArthurSaboya } from "@/types/solicitacao-pre-projeto-arthur-saboya";

export interface IRespostaMutacaoSolicitacao {
  ok: boolean;
  error: string | null;
  data: ISolicitacaoPreProjetoArthurSaboya | null;
  status: number;
}

export async function confirmarRespostaEnviadaPortalArthurSaboya(
  access_token: string,
  solicitacaoId: string,
): Promise<IRespostaMutacaoSolicitacao> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(solicitacaoId);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}/confirmar-resposta-enviada`;
  try {
    const res = await fetch(url, {
      method: "POST",
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
    if (res.status === 200 || res.status === 201) {
      return {
        ok: true,
        error: null,
        data: body as ISolicitacaoPreProjetoArthurSaboya,
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

export async function marcarAguardandoDataPortalArthurSaboya(
  access_token: string,
  solicitacaoId: string,
): Promise<IRespostaMutacaoSolicitacao> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(solicitacaoId);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}/marcar-aguardando-data`;
  try {
    const res = await fetch(url, {
      method: "POST",
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
    if (res.status === 200 || res.status === 201) {
      return {
        ok: true,
        error: null,
        data: body as ISolicitacaoPreProjetoArthurSaboya,
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

export async function criarAgendamentoDaSolicitacaoPortalArthurSaboya(
  access_token: string,
  solicitacaoId: string,
  payload: { dataHora: string; coordenadoriaId: string; tecnicoId: string },
): Promise<IRespostaMutacaoSolicitacao> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(solicitacaoId);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}/criar-agendamento`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(access_token),
      },
      body: JSON.stringify(payload),
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
        data: body as ISolicitacaoPreProjetoArthurSaboya,
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

export async function atribuirTecnicoCoordenadoriaSolicitacaoPortalArthurSaboya(
  access_token: string,
  solicitacaoId: string,
  payload: { tecnicoId: string },
): Promise<IRespostaMutacaoSolicitacao> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const seg = encodeURIComponent(solicitacaoId);
  const url = `${baseURL}agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/${seg}/atribuir-tecnico-coordenadoria`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(access_token),
      },
      body: JSON.stringify(payload),
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
        data: body as ISolicitacaoPreProjetoArthurSaboya,
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
