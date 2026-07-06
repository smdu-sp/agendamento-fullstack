/** @format */

/** Duração padrão das reuniões da Sala Arthur Saboya (pré-projetos). */
export const DURACAO_REUNIAO_ARTHUR_SABOYA_MS = 30 * 60 * 1000;

const TEXTO_CONDICOES_ATENDIMENTO_TECNICO =
  "[n]CONDIÇÕES DO ATENDIMENTO[/n]\r\n\r\n" +
  "A participação implica aceitação das condições previstas na Lei nº 18.375/2025 (art. 21) e na Portaria SMUL nº 167/2024 (arts. 7º e 8º).\r\n\r\n" +
  "O atendimento é remoto, via Microsoft Teams, com observância da LGPD.\r\n\r\n" +
  "O atendimento tem caráter orientativo e não vincula a análise ou decisão do pedido.\r\n\r\n" +
  "O ingresso na reunião no horário agendado configura aceitação tácita destas condições.";

function textoCondicoesSemMarcacao(): string {
  return TEXTO_CONDICOES_ATENDIMENTO_TECNICO.replace(
    /\[n\]([\s\S]*?)\[\/n\]/g,
    "$1",
  ).replace(/\[l=([\s\S]*?)\]([\s\S]*?)\[\/l\]/g, "$2 ($1)");
}

/** Texto legal em texto simples para colar no corpo do convite (Outlook Web). */
export function corpoTextoPlanoCondicoesAtendimentoTecnicoOutlook(
  dataHoraAtendimentoBrasilia?: string,
): string {
  const condicoes = textoCondicoesSemMarcacao();
  if (!dataHoraAtendimentoBrasilia?.trim()) return condicoes;
  return (
    `Data e hora do atendimento (horário de Brasília): ${dataHoraAtendimentoBrasilia.trim()}\r\n\r\n` +
    condicoes
  );
}

/** Copia o corpo do convite para a área de transferência (gesto do usuário). */
export function copiarCorpoConviteOutlookAgendamentoTecnico(
  dataHoraAtendimentoBrasilia?: string,
): boolean {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    void navigator.clipboard.writeText(
      corpoTextoPlanoCondicoesAtendimentoTecnicoOutlook(
        dataHoraAtendimentoBrasilia,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Texto legal exibido no corpo do convite (Teams / Outlook Web), com marcações
 * `[n]…[/n]` = negrito e `[l=url]…[/l]` = link.
 */
export function corpoHtmlCondicoesAtendimentoTecnicoOutlook(
  dataHoraAtendimentoBrasilia?: string,
): string {
  const bodyHtml = TEXTO_CONDICOES_ATENDIMENTO_TECNICO
    .replace(/\[n\]([\s\S]*?)\[\/n\]/g, "<strong>$1</strong>")
    .replace(
      /\[l=([\s\S]*?)\]([\s\S]*?)\[\/l\]/g,
      (_, url: string, text: string) =>
        `<a href="${url.trim().replace(/&/g, "&amp;")}">${text}</a>`,
    )
    .replace(/\r\n\r\n/g, "</p><p>")
    .replace(/\r\n/g, "<br/>");
  const condicoes = `<p>${bodyHtml}</p>`;
  if (!dataHoraAtendimentoBrasilia?.trim()) return condicoes;
  return (
    `<p><strong>Data e hora do atendimento (horário de Brasília):</strong> ${dataHoraAtendimentoBrasilia.trim()}</p>` +
    condicoes
  );
}

export type AbrirOutlookComposeAgendamentoParams = {
  /** E-mail da coordenadoria (calendário / organizador no Outlook Web). */
  emailOrganizadorCoordenadoria: string;
  assunto: string;
  inicioIso: string;
  fimIso: string;
  /** Munícipe + técnico(s); duplicatas removidas. */
  emailsParticipantes: string[];
  /**
   * Janela já aberta por gesto do usuário (evita bloqueio de popup
   * quando o compose é disparado após operações assíncronas).
   */
  targetWindow?: Window | null;
  /** Ex.: "02/06/2026 às 14:30" — exibido no topo do corpo do convite. */
  dataHoraAtendimentoBrasilia?: string;
  /**
   * Não envia o corpo na URL (evita AADSTS90015 com muitos participantes).
   * O chamador deve copiar o texto antes, se a ação for assíncrona.
   */
  corpoViaAreaTransferencia?: boolean;
};

export type AbrirOutlookComposeAgendamentoResultado = {
  corpoCopiado: boolean;
};

/**
 * Abre o compose do Outlook Web com reunião online (Teams).
 * Por padrão o corpo vai na URL; com `corpoViaAreaTransferencia` o chamador cola manualmente.
 */
export function abrirOutlookComposeAgendamentoTecnico(
  params: AbrirOutlookComposeAgendamentoParams,
): AbrirOutlookComposeAgendamentoResultado {
  const org = params.emailOrganizadorCoordenadoria.trim();
  if (!org) return { corpoCopiado: false };

  const corpoViaAreaTransferencia = params.corpoViaAreaTransferencia === true;

  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const e of params.emailsParticipantes) {
    const t = (e || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    lista.push(t);
  }
  const to = lista.join(",");

  const paramsUrl = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: params.inicioIso,
    enddt: params.fimIso,
    subject: params.assunto,
    hideattn: "true",
    online: "true",
  });
  if (!corpoViaAreaTransferencia) {
    paramsUrl.set(
      "body",
      corpoHtmlCondicoesAtendimentoTecnicoOutlook(
        params.dataHoraAtendimentoBrasilia,
      ),
    );
  }
  if (to) paramsUrl.set("to", to);
  paramsUrl.set("from", org);

  const emailEncoded = encodeURIComponent(org);
  const url = `https://outlook.office.com/calendar/${emailEncoded}/deeplink/compose?${paramsUrl.toString()}`;
  if (typeof window !== "undefined") {
    if (params.targetWindow && !params.targetWindow.closed) {
      params.targetWindow.location.href = url;
      return { corpoCopiado: false };
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return { corpoCopiado: false };
}
