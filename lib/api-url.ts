/** @format */

/**
 * Retorna a URL da API correta baseado no ambiente:
 * - Server-side (Docker): usa INTERNAL_API_URL para evitar timeout
 * - Client-side: usa NEXT_PUBLIC_API_URL
 * Sempre termina com / para concatenar rotas corretamente (ex: baseURL + 'agendamentos/buscar-tudo').
 */
export function getApiUrl(): string {
  let url: string;
  if (typeof window === 'undefined') {
    url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  } else {
    url = process.env.NEXT_PUBLIC_API_URL || '';
  }
  return url && !url.endsWith('/') ? `${url}/` : url;
}

// Para compatibilidade com código existente
export const API_URL = getApiUrl();
