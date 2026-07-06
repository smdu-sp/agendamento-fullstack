type DateInput = Date | string | null | undefined;

/**
 * A API de agendamentos grava data/hora **civil de São Paulo** nos componentes
 * UTC do `Date` (ver `instanteCivilSaoPauloSemDeslocamento` no backend). O
 * compose do Outlook Web trata `startdt`/`enddt` como instante UTC absoluto; sem
 * esta conversão o horário aparece 3 h adiantado no fuso de Brasília.
 */
export function instanteUtcRealDesdeDataHoraApi(entrada: Date | string): Date {
  const d = typeof entrada === "string" ? new Date(entrada) : entrada;
  if (Number.isNaN(d.getTime())) return d;
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours() + 3,
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

export function formatarDataHoraSaoPaulo(
  valor: DateInput,
  incluirAs: boolean = false,
): string {
  if (!valor) return "—";

  const sep = incluirAs ? " às " : " ";

  if (typeof valor === "string") {
    // Extrai as partes diretamente da string ISO sem criar Date,
    // evitando qualquer conversão de fuso em servidor ou navegador.
    // Ex: "2026-04-29T14:30:00.000Z" → "29/04/2026 às 14:30"
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}${sep}${m[4]}:${m[5]}`;
    return "—";
  }

  // Para objetos Date (criados localmente, ex: seletor de calendário)
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}${sep}${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
