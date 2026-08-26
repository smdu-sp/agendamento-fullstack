/** @format */

export const CHAVE_EMAIL_MARCADOR_REUNIOES = 'TEAMS_ORGANIZER_EMAIL';

export interface IConfiguracaoReunioes {
  emailMarcador: string;
  atualizadoEm: string | null;
  atualizadoPorNome: string | null;
}

export interface IRespostaConfiguracao {
  ok: boolean;
  error: string | null;
  data: IConfiguracaoReunioes | { displayName?: string; mail?: string } | null;
  status: number;
}
