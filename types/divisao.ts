export interface IDivisao {
  id: string;
  sigla: string;
  nome?: string | null;
  status: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  coordenadoriaId?: string | null;
  coordenadoria?: { id: string; sigla: string; nome?: string | null } | null;
}

export interface ICreateDivisao {
  sigla: string;
  nome?: string;
  coordenadoriaId?: string;
  status?: boolean;
}

export interface IUpdateDivisao {
  sigla?: string;
  nome?: string;
  coordenadoriaId?: string;
  status?: boolean;
}

export interface IPaginadoDivisao {
  data: IDivisao[];
  total: number;
  pagina: number;
  limite: number;
}

export interface IRespostaDivisao {
  ok: boolean;
  error: string | null;
  data: IDivisao | IDivisao[] | IPaginadoDivisao | { desativado: boolean } | null;
  status: number;
}
