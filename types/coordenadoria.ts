/** @format */

export interface ICoordenadoria {
	id: string;
	sigla: string;
	nome?: string;
	email?: string;
	status: boolean;
	criadoEm: Date;
	atualizadoEm: Date;
}

export interface ICreateCoordenadoria {
	sigla: string;
	nome?: string;
	email?: string;
	status?: boolean;
}

export interface IUpdateCoordenadoria {
	sigla?: string;
	nome?: string;
	email?: string;
	status?: boolean;
}

export interface IPaginadoCoordenadoria {
	data: ICoordenadoria[];
	total: number;
	pagina: number;
	limite: number;
}

export interface IRespostaCoordenadoria {
	ok: boolean;
	error: string | null;
	data:
		| ICoordenadoria
		| ICoordenadoria[]
		| IPaginadoCoordenadoria
		| { desativado: boolean }
		| null;
	status: number;
}
