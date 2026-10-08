/** @format */

export interface IMunicipe {
	id: string;
	nome: string;
	email: string;
	status: boolean;
	ultimoLogin: Date | null;
	criadoEm: Date;
	atualizadoEm: Date;
	totalAgendamentos: number;
	totalSolicitacoesPreProjeto: number;
}

export interface IUpdateMunicipe {
	nome?: string;
	email?: string;
}

export interface IPaginadoMunicipe {
	data: IMunicipe[];
	total: number;
	pagina: number;
	limite: number;
}

export interface IRespostaMunicipe {
	ok: boolean;
	error: string | null;
	data:
		| IPaginadoMunicipe
		| IMunicipe
		| { senhaTemporaria: string }
		| { status: boolean }
		| null;
	status: number;
}
