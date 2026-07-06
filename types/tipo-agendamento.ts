/** @format */

export interface ITipoAgendamento {
	id: string;
	texto: string;
	status: boolean;
	criadoEm: Date;
	atualizadoEm: Date;
}

export interface ICreateTipoAgendamento {
	texto: string;
	status?: boolean;
}

export interface IUpdateTipoAgendamento {
	texto?: string;
	status?: boolean;
}

export interface IPaginadoTipoAgendamento {
	data: ITipoAgendamento[];
	total: number;
	pagina: number;
	limite: number;
}

export interface IRespostaTipoAgendamento {
	ok: boolean;
	error: string | null;
	data:
		| ITipoAgendamento
		| ITipoAgendamento[]
		| IPaginadoTipoAgendamento
		| { desativado: boolean }
		| null;
	status: number;
}
