/** @format */

export interface IUsuario {
  id: string;
  nome: string;
  login: string;
  email: string;
  permissao: IPermissao;
  avatar?: string;
  status: boolean;
  ultimoLogin: Date;
  criadoEm: Date;
  atualizadoEm: Date;
  nomeSocial?: string;
  divisaoId?: string;
  divisao?: {
    id: string;
    sigla: string;
    nome?: string | null;
    coordenadoriaId?: string | null;
    coordenadoria?: { id: string; sigla: string; nome?: string | null } | null;
  } | null;
}

export enum IPermissao {
  DEV,
  TEC,
  ADM,
  USR,
  PONTO_FOCAL,
  COORDENADOR,
  PORTARIA,
  DIRETOR,
}

export interface ICreateUsuario {
  nome: string;
  email: string;
  login: string;
  avatar?: string;
  permissao?: IPermissao;
  status?: boolean;
  nomeSocial?: string;
  divisaoId?: string;
}

export interface IUpdateUsuario {
  id?: string;
  status?: boolean;
  nomeSocial?: string;
  avatar?: string;
  permissao?: IPermissao;
  divisaoId?: string;
}

export interface IPaginadoUsuario {
  data: IUsuario[];
  total: number;
  pagina: number;
  limite: number;
}

export interface INovoUsuario {
  login: string;
  nome: string;
  email: string;
}

export interface IUsuarioTecnico {
  id: string;
  nome: string;
}

export interface IRespostaUsuario {
  ok: boolean;
  error: string | null;
  data:
    | INovoUsuario
    | IUsuario
    | IUsuario[]
    | IUsuarioTecnico[]
    | IPaginadoUsuario
    | { autorizado: boolean }
    | { desativado: boolean }
    | null;
  status: number;
}

export interface IUsuarioSession {
  sub: string;
  nome: string;
  login: string;
  email: string;
  nomeSocial?: string;
  permissao: string;
  status: number;
  avatar?: string;
  iat: number;
  exp: number;
}
