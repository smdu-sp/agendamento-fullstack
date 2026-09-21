import 'dotenv/config';
import { corpoHtmlCondicoesAtendimentoTecnicoOutlook } from '../lib/outlook-agendamento-teams';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL_BASE = 'https://login.microsoftonline.com';

const ORGANIZADOR = 'blvieira@prefeitura.sp.gov.br';
const COORDENADORIA = { email: 'caepp_atendimento@PREFEITURA.SP.GOV.BR', nome: 'CAEPP Atendimento' };
const DURACAO_MIN = 30;

type Reuniao = {
  processo: string;
  emailMunicipe: string;
  emailTecnico: string;
  data: string; // DD/MM/YYYY
  hora: string; // HH:mm
};

const REUNIOES: Reuniao[] = [
  { processo: '1020.2022/0011125-7', emailMunicipe: 'ARQLINS@HOTMAIL.COM', emailTecnico: 'hercilia@prefeitura.sp.gov.br', data: '27/08/2026', hora: '14:00' },
  { processo: '1020.2024/0003209-1', emailMunicipe: 'priscila.trevisan01@gmail.com', emailTecnico: 'mariliacampos@prefeitura.sp.gov.br', data: '27/08/2026', hora: '14:00' },
  { processo: '2026-0003655-1', emailMunicipe: 'arqmarianadias@yahoo.com.br', emailTecnico: 'fdciomo@prefeitura.sp.gov.br', data: '27/08/2026', hora: '14:00' },
  { processo: '2024-0009980-0', emailMunicipe: 'regulatorio@trammite.com.br', emailTecnico: 'anacferreira@prefeitura.sp.gov.br', data: '27/08/2026', hora: '14:30' },
  { processo: '2021-0007890-5', emailMunicipe: '1960alvaro@gmail.com', emailTecnico: 'mariliacampos@prefeitura.sp.gov.br', data: '27/08/2026', hora: '14:30' },
  { processo: '1020.2026/0016285-1', emailMunicipe: 'cguazzelli@cguazzelli.com.br', emailTecnico: 'cristianoquintela@prefeitura.sp.gov.br', data: '27/08/2026', hora: '15:00' },
  { processo: '2026-0004964-5', emailMunicipe: 'pmspprocesso@gmail.com', emailTecnico: 'fdciomo@prefeitura.sp.gov.br', data: '27/08/2026', hora: '15:00' },
  { processo: '2026-0004964-5', emailMunicipe: 'pmspprocesso@gmail.com', emailTecnico: 'fdciomo@prefeitura.sp.gov.br', data: '27/08/2026', hora: '15:30' },
  { processo: '1020.2025/0002348-5', emailMunicipe: 'contato@mgmarquitetura.com.br', emailTecnico: 'cristianoquintela@prefeitura.sp.gov.br', data: '27/08/2026', hora: '16:00' },
  { processo: '1020.2024/0013614-8', emailMunicipe: 'thalyta.teixeira@grupospconsult.com.br', emailTecnico: 'ambuzunas@prefeitura.sp.gov.br', data: '27/08/2026', hora: '16:30' },
  { processo: '2026-0004298-5', emailMunicipe: 'ibarbosa@mundoapto.com.br', emailTecnico: 'fdciomo@prefeitura.sp.gov.br', data: '27/08/2026', hora: '16:30' },
];

class GraphError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let tokenCache: { accessToken: string; expiraEmMs: number } | null = null;

async function getGraphToken(): Promise<string> {
  const tenant = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  if (!tenant || !clientId || !clientSecret) {
    throw new GraphError(
      'Credenciais do Microsoft Graph não configuradas (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).',
      500,
    );
  }

  const agora = Date.now();
  if (tokenCache && tokenCache.expiraEmMs > agora + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(`${TOKEN_URL_BASE}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new GraphError(json.error_description || json.error || 'Falha ao autenticar no Microsoft Graph.', res.status);
  }
  const expiresIn = Number(json.expires_in || 3600);
  tokenCache = { accessToken: json.access_token, expiraEmMs: agora + expiresIn * 1000 };
  return json.access_token;
}

function usersPath(emailOuId: string): string {
  return `/users/${encodeURIComponent(emailOuId.trim())}`;
}

async function criarEventoTeams(params: {
  assunto: string;
  corpoHtml: string;
  inicioIso: string; // "YYYY-MM-DDTHH:mm:ss", civil (Brasília)
  fimIso: string;
  participantes: { email: string; nome?: string }[];
}): Promise<{ eventId: string; joinUrl: string | null }> {
  const token = await getGraphToken();
  const attendees = params.participantes
    .map((p) => ({
      emailAddress: { address: p.email.trim(), name: (p.nome || p.email).trim() },
      type: 'required' as const,
    }))
    .filter((a) => a.emailAddress.address);

  const payload = {
    subject: params.assunto,
    body: { contentType: 'HTML', content: params.corpoHtml },
    start: { dateTime: params.inicioIso, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: params.fimIso, timeZone: 'America/Sao_Paulo' },
    attendees,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    allowNewTimeProposals: false,
  };

  const res = await fetch(`${GRAPH_BASE}${usersPath(ORGANIZADOR)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }
  if (!res.ok) {
    const err = json as { error?: { message?: string }; message?: string };
    throw new GraphError(err?.error?.message || err?.message || `Erro Microsoft Graph (${res.status}).`, res.status);
  }
  const criado = json as { id?: string; onlineMeeting?: { joinUrl?: string } };
  if (!criado.id) throw new GraphError('A API do Graph não retornou o identificador do evento.', 500);
  return { eventId: criado.id, joinUrl: criado.onlineMeeting?.joinUrl?.trim() || null };
}

function isoParaGraph(data: string, hora: string): string {
  const [dia, mes, ano] = data.split('/').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ano}-${pad(mes)}-${pad(dia)}T${pad(h)}:${pad(m)}:00`;
}

function somarMinutos(data: string, hora: string, minutos: number): { data: string; hora: string } {
  const [dia, mes, ano] = data.split('/').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const base = new Date(Date.UTC(ano, mes - 1, dia, h, m + minutos));
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    data: `${pad(base.getUTCDate())}/${pad(base.getUTCMonth() + 1)}/${base.getUTCFullYear()}`,
    hora: `${pad(base.getUTCHours())}:${pad(base.getUTCMinutes())}`,
  };
}

async function main() {
  console.log(`Criando ${REUNIOES.length} reuniões Teams. Organizador: ${ORGANIZADOR}\n`);
  let ok = 0;
  let falhas = 0;
  for (const [index, r] of REUNIOES.entries()) {
    const fim = somarMinutos(r.data, r.hora, DURACAO_MIN);
    const inicioIso = isoParaGraph(r.data, r.hora);
    const fimIso = isoParaGraph(fim.data, fim.hora);
    const dataHoraLabel = `${r.data} às ${r.hora}`;
    const assunto = `Agendamento Técnico - CAEPP - Processo: ${r.processo}`;

    try {
      const evento = await criarEventoTeams({
        assunto,
        corpoHtml: corpoHtmlCondicoesAtendimentoTecnicoOutlook(dataHoraLabel),
        inicioIso,
        fimIso,
        participantes: [
          { email: r.emailTecnico },
          { email: r.emailMunicipe },
          { email: COORDENADORIA.email, nome: COORDENADORIA.nome },
        ],
      });
      ok++;
      console.log(
        `[${index + 1}/${REUNIOES.length}] OK  processo=${r.processo} ${dataHoraLabel} eventId=${evento.eventId} joinUrl=${evento.joinUrl ?? '(pendente)'}`,
      );
    } catch (e) {
      falhas++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${index + 1}/${REUNIOES.length}] FALHOU processo=${r.processo} ${dataHoraLabel}: ${msg}`);
    }
  }
  console.log(`\nConcluído: ${ok} criadas, ${falhas} falhas.`);
}

main().catch((e) => {
  console.error('Erro fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
