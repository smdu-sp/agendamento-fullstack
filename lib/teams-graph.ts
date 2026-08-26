import 'server-only';

/**
 * Cliente Microsoft Graph (client credentials) para criar/cancelar reuniões
 * Teams e ler relatórios de presença.
 *
 * Variáveis: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL_BASE = 'https://login.microsoftonline.com';

type TokenCache = { accessToken: string; expiraEmMs: number };
let tokenCache: TokenCache | null = null;

export class GraphError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
  }
}

export function graphConfigurado(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID?.trim() &&
      process.env.AZURE_CLIENT_ID?.trim() &&
      process.env.AZURE_CLIENT_SECRET?.trim(),
  );
}

async function getGraphToken(): Promise<string> {
  if (!graphConfigurado()) {
    throw new GraphError(
      'Credenciais do Microsoft Graph não configuradas (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).',
      500,
    );
  }
  const agora = Date.now();
  if (tokenCache && tokenCache.expiraEmMs > agora + 60_000) {
    return tokenCache.accessToken;
  }

  const tenant = process.env.AZURE_TENANT_ID!.trim();
  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!.trim(),
    client_secret: process.env.AZURE_CLIENT_SECRET!.trim(),
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
    throw new GraphError(
      json.error_description || json.error || 'Falha ao autenticar no Microsoft Graph.',
      res.status,
    );
  }
  const expiresIn = Number(json.expires_in || 3600);
  tokenCache = {
    accessToken: json.access_token,
    expiraEmMs: agora + expiresIn * 1000,
  };
  return json.access_token;
}

async function graphFetch<T>(
  path: string,
  init?: RequestInit & { ignoreStatuses?: number[] },
): Promise<T | null> {
  const token = await getGraphToken();
  const ignore = init?.ignoreStatuses ?? [];
  const { ignoreStatuses: _i, ...rest } = init ?? {};
  void _i;
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers || {}),
    },
  });

  const text = await res.text();
  if (res.status === 204) return null;
  if (ignore.includes(res.status)) return null;
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
    const msg = err?.error?.message || err?.message || `Erro Microsoft Graph (${res.status}).`;
    throw new GraphError(msg, res.status);
  }
  return json as T;
}

function usersPath(emailOuId: string): string {
  return `/users/${encodeURIComponent(emailOuId.trim())}`;
}

export type GraphAttendee = {
  email: string;
  nome?: string;
};

export type GraphEventoCriado = {
  eventId: string;
  joinUrl: string | null;
  meetingId: string | null;
};

export async function graphBuscarUsuario(email: string): Promise<{
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  id?: string;
}> {
  const data = await graphFetch<{
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
    id?: string;
  }>(
    `${usersPath(email)}?$select=id,displayName,mail,userPrincipalName`,
  );
  return data ?? {};
}

function dataHoraCivilParaGraph(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export async function graphCriarEventoTeams(params: {
  organizerEmail: string;
  assunto: string;
  corpoHtml: string;
  inicio: Date;
  fim: Date;
  participantes: GraphAttendee[];
}): Promise<GraphEventoCriado> {
  const attendees = params.participantes
    .map((p) => ({
      emailAddress: {
        address: p.email.trim(),
        name: (p.nome || p.email).trim(),
      },
      type: 'required' as const,
    }))
    .filter((a) => a.emailAddress.address);

  const payload = {
    subject: params.assunto,
    body: { contentType: 'HTML', content: params.corpoHtml },
    start: {
      dateTime: dataHoraCivilParaGraph(params.inicio),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: dataHoraCivilParaGraph(params.fim),
      timeZone: 'America/Sao_Paulo',
    },
    attendees,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    allowNewTimeProposals: false,
  };

  const criado = await graphFetch<{
    id?: string;
    onlineMeeting?: { joinUrl?: string; id?: string };
  }>(`${usersPath(params.organizerEmail)}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const eventId = criado?.id;
  if (!eventId) {
    throw new GraphError('A API do Graph não retornou o identificador do evento.');
  }

  const joinUrl = criado.onlineMeeting?.joinUrl?.trim() || null;
  let meetingId = criado.onlineMeeting?.id?.trim() || null;
  if (!meetingId && joinUrl) {
    meetingId = await graphResolverMeetingId(params.organizerEmail, joinUrl);
  }

  return { eventId, joinUrl, meetingId };
}

export async function graphResolverMeetingId(
  organizerEmail: string,
  joinUrl: string,
): Promise<string | null> {
  const escaped = joinUrl.replace(/'/g, "''");
  const filter = encodeURIComponent(`JoinWebUrl eq '${escaped}'`);
  try {
    const data = await graphFetch<{ value?: { id?: string }[] }>(
      `${usersPath(organizerEmail)}/onlineMeetings?$filter=${filter}`,
    );
    return data?.value?.[0]?.id?.trim() || null;
  } catch (e) {
    console.error('[Graph] Falha ao resolver meetingId:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function graphCancelarEvento(
  organizerEmail: string,
  eventId: string,
  comentario: string,
): Promise<void> {
  await graphFetch(`${usersPath(organizerEmail)}/events/${encodeURIComponent(eventId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ comment: comentario }),
    ignoreStatuses: [404],
  });
}

export type GraphPresenca = {
  displayName: string | null;
  email: string | null;
  role: string | null;
  durationSeconds: number | null;
  joinDateTime: Date | null;
  leaveDateTime: Date | null;
};

type AttendanceReport = { id?: string; totalParticipantCount?: number };
type AttendanceRecord = {
  emailAddress?: string;
  identity?: { displayName?: string; id?: string };
  role?: string;
  totalAttendanceInSeconds?: number;
  attendanceIntervals?: {
    joinDateTime?: string;
    leaveDateTime?: string;
    durationInSeconds?: number;
  }[];
};

export async function graphBuscarPresencas(
  organizerEmail: string,
  meetingId: string,
): Promise<{ relatorioEncontrado: boolean; presencas: GraphPresenca[] }> {
  const reports = await graphFetch<{ value?: AttendanceReport[] }>(
    `${usersPath(organizerEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports`,
    { ignoreStatuses: [404] },
  );
  const lista = reports?.value ?? [];
  if (!lista.length) {
    return { relatorioEncontrado: false, presencas: [] };
  }

  const reportId = lista[0]?.id;
  if (!reportId) {
    return { relatorioEncontrado: true, presencas: [] };
  }

  const records = await graphFetch<{ value?: AttendanceRecord[] }>(
    `${usersPath(organizerEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports/${encodeURIComponent(reportId)}/attendanceRecords`,
    { ignoreStatuses: [404] },
  );

  const presencas: GraphPresenca[] = (records?.value ?? []).map((r) => {
    const intervals = r.attendanceIntervals ?? [];
    const firstJoin = intervals[0]?.joinDateTime;
    const lastLeave = intervals[intervals.length - 1]?.leaveDateTime;
    return {
      displayName: r.identity?.displayName?.trim() || null,
      email: r.emailAddress?.trim() || null,
      role: r.role?.trim() || null,
      durationSeconds:
        typeof r.totalAttendanceInSeconds === 'number' ? r.totalAttendanceInSeconds : null,
      joinDateTime: firstJoin ? new Date(firstJoin) : null,
      leaveDateTime: lastLeave ? new Date(lastLeave) : null,
    };
  });

  return { relatorioEncontrado: true, presencas };
}
