/** @format */

export interface IMotivo {
	id: string;
	texto: string;
	status: boolean;
	criadoEm: Date;
	atualizadoEm: Date;
}

export interface ICreateMotivo {
	texto: string;
	status?: boolean;
}

export interface IUpdateMotivo {
	texto?: string;
	status?: boolean;
}

export interface IPaginadoMotivo {
	data: IMotivo[];
	total: number;
	pagina: number;
	limite: number;
}

export interface IRespostaMotivo {
	ok: boolean;
	error: string | null;
	data: IMotivo | IMotivo[] | IPaginadoMotivo | { desativado: boolean } | null;
	status: number;
}
