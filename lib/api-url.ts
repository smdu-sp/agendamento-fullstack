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

/** Auth do munícipe vive neste app (não no backend Nest). */
export function getMunicipeAuthApiUrl(caminho: string): string {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '/agendamento').replace(/\/$/, '');
  const path = caminho.startsWith('/') ? caminho : `/${caminho}`;
  return `${basePath}/api/municipes/auth${path}`;
}
