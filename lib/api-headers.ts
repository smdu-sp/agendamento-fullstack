/**
 * Retorna headers de autenticação para chamadas à API.
 * Quando o usuário é DEV e há personificação em localStorage, adiciona X-Impersonate-Permissao.
 */
const STORAGE_KEY = "impersonate_permissao";

export function getImpersonatePermissao(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setImpersonatePermissaoStorage(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${STORAGE_KEY}=; path=/; max-age=0; samesite=lax`;
    }
  } catch {
    // ignore
  }
}

export function getAuthHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const imp = getImpersonatePermissao();
  if (imp) headers["X-Impersonate-Permissao"] = imp;
  return headers;
}
