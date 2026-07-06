const CHAVE_TOKEN = "municipe_access_token";
const CHAVE_NOME = "municipe_nome";
const CHAVE_EMAIL = "municipe_email";

/** Disparado na mesma aba quando a sessão muda (localStorage não emite `storage` na aba ativa). */
export const EVENTO_SESSAO_MUNICIPE = "municipe-sessao-alterada";

function emitirSessaoAlterada(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_SESSAO_MUNICIPE));
}

function decodificarPayloadJwt(token: string): Record<string, unknown> | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function salvarSessaoMunicipe(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAVE_TOKEN, token);
  const payload = decodificarPayloadJwt(token);
  const nome = payload?.nome;
  if (typeof nome === "string" && nome.trim()) {
    localStorage.setItem(CHAVE_NOME, nome.trim());
  } else {
    localStorage.removeItem(CHAVE_NOME);
  }
  const email = payload?.email;
  if (typeof email === "string" && email.trim()) {
    localStorage.setItem(CHAVE_EMAIL, email.trim().toLowerCase());
  } else {
    localStorage.removeItem(CHAVE_EMAIL);
  }
  emitirSessaoAlterada();
}

export function encerrarSessaoMunicipe(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_NOME);
  localStorage.removeItem(CHAVE_EMAIL);
  emitirSessaoAlterada();
}

export function obterNomeMunicipe(): string | null {
  if (typeof window === "undefined") return null;
  const salvo = localStorage.getItem(CHAVE_NOME);
  if (salvo) return salvo;
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (!token) return null;
  const payload = decodificarPayloadJwt(token);
  const nome = payload?.nome;
  if (typeof nome === "string" && nome.trim()) {
    localStorage.setItem(CHAVE_NOME, nome.trim());
    return nome.trim();
  }
  return null;
}

export function obterEmailMunicipe(): string | null {
  if (typeof window === "undefined") return null;
  const salvo = localStorage.getItem(CHAVE_EMAIL);
  if (salvo) return salvo;
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (!token) return null;
  const payload = decodificarPayloadJwt(token);
  const email = payload?.email;
  if (typeof email === "string" && email.trim()) {
    const normalizado = email.trim().toLowerCase();
    localStorage.setItem(CHAVE_EMAIL, normalizado);
    return normalizado;
  }
  return null;
}

function tokenEstaValido(token: string): boolean {
  const payload = decodificarPayloadJwt(token);
  if (!payload) return false;
  const exp = payload.exp;
  if (typeof exp !== "number") return true;
  return Date.now() / 1000 < exp;
}

export function municipeEstaLogado(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (!token) return false;
  if (!tokenEstaValido(token)) {
    encerrarSessaoMunicipe();
    return false;
  }
  return true;
}

/** Token JWT do portal munícipe (localStorage), para chamadas autenticadas à API. */
export function obterTokenMunicipe(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (!token) return null;
  if (!tokenEstaValido(token)) {
    encerrarSessaoMunicipe();
    return null;
  }
  return token;
}
