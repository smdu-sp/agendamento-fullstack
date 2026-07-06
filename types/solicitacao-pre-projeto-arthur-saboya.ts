/** @format */

export type StatusSolicitacaoPreProjetoArthurSaboya =
  | "SOLICITADO"
  | "RESPONDIDO"
  | "AGUARDANDO_DATA"
  | "AGENDAMENTO_CRIADO";

export type AutorMensagemPreProjetoArthurSaboya =
  | "MUNICIPE"
  | "PONTO_FOCAL"
  | "SISTEMA";

export interface IMensagemPreProjetoArthurSaboya {
  id: string;
  autor: AutorMensagemPreProjetoArthurSaboya;
  corpo: string;
  criadoEm: string;
  nomeRemetente?: string | null;
}

export interface ISolicitacaoPreProjetoArthurSaboya {
  id: string;
  protocolo: string;
  criadoEm: string;
  nome: string;
  email: string;
  formacaoValor: string;
  formacaoOutro?: string | null;
  formacaoTexto: string;
  naturezaValor: string;
  naturezaOutro?: string | null;
  naturezaTexto: string;
  duvida: string;
  status: StatusSolicitacaoPreProjetoArthurSaboya;
  agendamentoId?: string | null;
  dataAgendamento?: string | null;
  avaliacaoNota?: number | null;
  avaliacaoComentario?: string | null;
  avaliacaoEm?: string | null;
  /** E-mail institucional sugerido (coordenadoria da divisão ou da solicitação). */
  emailContatoDivisao?: string | null;
  coordenadoriaId?: string | null;
  divisaoId?: string | null;
  tecnicoArthurId?: string | null;
  tecnicoArthurNome?: string | null;
  tecnicoArthurEmail?: string | null;
  emailTecnicoCoordenadoria?: string | null;
  /** Sigla (e nome, se houver) da coordenadoria vinculada à solicitação ou à divisão. */
  coordenadoriaTexto?: string | null;
  mensagens: Partial<IMensagemPreProjetoArthurSaboya>[];
}

export interface ISolicitacaoPreProjetoArthurSaboyaDetalhe
  extends ISolicitacaoPreProjetoArthurSaboya {
  mensagens: IMensagemPreProjetoArthurSaboya[];
}

export interface IPaginadoSolicitacoesPreProjetoArthurSaboya {
  total: number;
  pagina: number;
  limite: number;
  data: ISolicitacaoPreProjetoArthurSaboya[];
}

export interface IRespostaSolicitacoesPreProjetoArthurSaboya {
  ok: boolean;
  error: string | null;
  data: IPaginadoSolicitacoesPreProjetoArthurSaboya | null;
  status: number;
}
