/** @format */

export enum StatusAgendamento {
  SOLICITADO = "SOLICITADO",
  AGENDADO = "AGENDADO",
  CANCELADO = "CANCELADO",
  CONCLUIDO = "CONCLUIDO",
  ATENDIDO = "ATENDIDO",
  NAO_REALIZADO = "NAO_REALIZADO",
}

export interface IAgendamento {
  id: string;
  municipe?: string;
  cpf?: string;
  processo?: string;
  dataHora: Date;
  dataFim?: Date;
  importado: boolean;
  importadoOutlook?: boolean;
  tecnicoResponsavelPlanilha?: string | null;
  resumo?: string;
  tipoAgendamentoId?: string;
  motivoNaoAtendimentoId?: string;
  coordenadoriaId?: string;
  divisaoId?: string | null;
  tecnicoId?: string;
  tecnicoRF?: string;
  email?: string;
  status: StatusAgendamento;
  criadoEm: Date;
  atualizadoEm: Date;
  tipoAgendamento?: { id: string; texto: string } | null;
  motivoNaoAtendimento?: { id: string; texto: string } | null;
  coordenadoria?: { id: string; sigla: string; nome?: string | null; email?: string | null } | null;
  tecnico?: {
    id: string;
    nome: string;
    login: string;
    email: string;
    divisao?: { sigla: string } | null;
  } | null;
}

export interface ICreateAgendamento {
  municipe?: string;
  cpf?: string;
  processo?: string;
  dataHora: string;
  dataFim?: string;
  resumo?: string;
  tipoAgendamentoId?: string;
  coordenadoriaId?: string;
  tecnicoId?: string;
  tecnicoRF?: string;
  email?: string;
}

export interface IUpdateAgendamento {
  municipe?: string;
  cpf?: string;
  processo?: string;
  dataHora?: string;
  dataFim?: string;
  resumo?: string;
  motivoNaoAtendimentoId?: string;
  coordenadoriaId?: string;
  tecnicoId?: string;
  tecnicoRF?: string;
  email?: string;
  status?: StatusAgendamento;
}

export interface IPaginadoAgendamento {
  data: IAgendamento[];
  total: number;
  pagina: number;
  limite: number;
}

export interface IUltimaImportacaoPlanilha {
  dataHora: string;
  total: number;
  usuarioNome?: string | null;
}

export interface IUltimaImportacaoOutlook {
  dataHora: string;
  total: number;
  usuarioNome?: string | null;
}

export interface IRespostaAgendamento {
  ok: boolean;
  error: string | null;
  data:
    | IAgendamento
    | IAgendamento[]
    | IPaginadoAgendamento
    | { excluido: boolean }
    | { importados: number; erros: number }
    | null;
  status: number;
}
