/** @format */

import { getApiUrl } from "@/lib/api-url";
import type {
  IPaginadoSolicitacoesPreProjetoArthurSaboya,
  ISolicitacaoPreProjetoArthurSaboyaDetalhe,
} from "@/types/solicitacao-pre-projeto-arthur-saboya";

export interface IRespostaListaChamadosMunicipe {
  ok: boolean;
  error: string | null;
  data: IPaginadoSolicitacoesPreProjetoArthurSaboya | null;
  status: number;
}

export interface IRespostaDetalheChamadoMunicipe {
  ok: boolean;
  error: string | null;
  data: ISolicitacaoPreProjetoArthurSaboyaDetalhe | null;
  status: number;
}

function authMunicipe(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listarChamadosPreProjetosMunicipe(
  municipeToken: string,
  pagina: number = 1,
  limite: number = 20,
): Promise<IRespostaListaChamadosMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const params = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
  });
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados?${params}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: authMunicipe(municipeToken),
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
        data: body as IPaginadoSolicitacoesPreProjetoArthurSaboya,
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

export async function obterChamadoPreProjetosMunicipe(
  municipeToken: string,
  id: string,
): Promise<IRespostaDetalheChamadoMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados/${id}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: authMunicipe(municipeToken),
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

export async function enviarMensagemChamadoPreProjetosMunicipe(
  municipeToken: string,
  id: string,
  texto: string,
): Promise<IRespostaDetalheChamadoMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados/${id}/mensagens`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authMunicipe(municipeToken),
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

export async function marcarChamadoPreProjetosMunicipeComoSolucionado(
  municipeToken: string,
  id: string,
): Promise<IRespostaDetalheChamadoMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados/${id}/marcar-solucionado`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authMunicipe(municipeToken),
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

export async function avaliarChamadoPreProjetosMunicipe(
  municipeToken: string,
  id: string,
  payload: { nota: number; comentario?: string },
): Promise<IRespostaDetalheChamadoMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados/${id}/avaliacao`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authMunicipe(municipeToken),
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

export async function cancelarAtendimentoChamadoPreProjetosMunicipe(
  municipeToken: string,
  id: string,
): Promise<IRespostaDetalheChamadoMunicipe> {
  const baseURL = getApiUrl();
  if (!baseURL) {
    return {
      ok: false,
      error: "URL da API não configurada.",
      data: null,
      status: 400,
    };
  }
  const url = `${baseURL}agendamentos/municipes/pre-projetos-chamados/${id}/cancelar-atendimento`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authMunicipe(municipeToken),
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
