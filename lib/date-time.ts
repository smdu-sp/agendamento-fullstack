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

/** Indica se o horário de término da reunião (civil SP) já passou. */
export function reuniaoJaTerminou(
  dataFim: Date | string | null | undefined,
  dataHora?: Date | string | null,
): boolean {
  const bruto = dataFim ?? (dataHora ? somarMinutosCivil(dataHora, 60) : null);
  if (!bruto) return false;
  const fimReal = instanteUtcRealDesdeDataHoraApi(bruto);
  if (Number.isNaN(fimReal.getTime())) return false;
  return Date.now() >= fimReal.getTime();
}

function somarMinutosCivil(entrada: Date | string, minutos: number): Date {
  const d = typeof entrada === "string" ? new Date(entrada) : entrada;
  return new Date(d.getTime() + minutos * 60 * 1000);
}

export function formatarDuracaoSegundos(segundos: number | null | undefined): string {
  if (segundos == null || Number.isNaN(segundos) || segundos < 0) return "—";
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
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
