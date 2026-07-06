'use client';

import { getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/lib/api-headers';

export interface PreviewSendResult {
  ok: boolean;
  error: string | null;
}

export async function enviarEmailPreview(params: {
  para: string;
  assunto: string;
  html: string;
  access_token: string;
}): Promise<PreviewSendResult> {
  try {
    const response = await fetch(`${getApiUrl()}email/preview-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(params.access_token),
      },
      body: JSON.stringify({
        para: params.para,
        assunto: params.assunto,
        html: params.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data?.message || `Erro ${response.status} ao enviar e-mail.`,
      };
    }

    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro inesperado ao enviar e-mail.',
    };
  }
}
