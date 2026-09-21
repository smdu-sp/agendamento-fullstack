/** @format */

/** Caixa Microsoft 365 que cria os convites Teams (Graph). */
export const EMAIL_MARCADOR_REUNIOES_PADRAO =
  'smuL_agendamento@prefeitura.sp.gov.br';

/** Caixa da Sala Arthur Saboya, sempre convidada nas reuniões desse fluxo. */
export const EMAIL_SABOYA_ATENDIMENTO =
  'saboya_atendimento@prefeitura.sp.gov.br';

/** Texto único em `tipos_agendamento` para o fluxo de pré-projetos (Arthur Saboya). */
export const TIPO_AGENDAMENTO_ARTHUR_SABOYA =
  'Pré-projetos (Arthur Saboya)';

export function ehTipoArthurSaboya(texto?: string | null): boolean {
  return (texto ?? '').trim() === TIPO_AGENDAMENTO_ARTHUR_SABOYA;
}

/** Título das reuniões técnicas (planilha / agendamentos normais). */
export function montarAssuntoReuniaoTecnica(
  siglaCoordenadoria: string,
  processo: string,
): string {
  return `Agendamento Técnico - ${siglaCoordenadoria} - Processo: ${processo}`.trim();
}

/** Título das reuniões da Sala Arthur Saboya. */
export function montarAssuntoReuniaoArthurSaboya(protocolo: string): string {
  return `Sala Arthur Saboya - Protocolo: ${protocolo}`.trim();
}

export function montarAssuntoReuniaoPorTipo(params: {
  tipoAgendamentoTexto?: string | null;
  siglaCoordenadoria?: string | null;
  processo?: string | null;
  protocolo?: string | null;
}): string {
  if (ehTipoArthurSaboya(params.tipoAgendamentoTexto)) {
    return montarAssuntoReuniaoArthurSaboya(
      (params.protocolo || params.processo || '').trim(),
    );
  }
  return montarAssuntoReuniaoTecnica(
    (params.siglaCoordenadoria ?? '').trim(),
    (params.processo ?? '').trim(),
  );
}
