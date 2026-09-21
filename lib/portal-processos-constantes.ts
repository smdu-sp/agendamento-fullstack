/** Constantes e rótulos do agendamento de processos em trâmite (portal munícipe). */

export const TIPOS_AGENDAMENTO_PORTAL_PROCESSO = [
	{
		texto: "Atendimento técnico sobre comunique-se ou indeferimento",
	},
	{
		texto: "Entrega de documentos para atendimento de comunique-se ou interposição de recurso de processos físicos",
	},
	{
		texto: "Retirada alvará/guia complementar/guias de outorga",
	},
	{
		texto: "Vista de processo físico",
	},
] as const;

export type TextoTipoAgendamentoPortalProcesso =
	(typeof TIPOS_AGENDAMENTO_PORTAL_PROCESSO)[number]["texto"];

export const RELACOES_INTERESSADO = [
	{ valor: "AUTOR_PROJETO", rotulo: "Autor do projeto" },
	{ valor: "AUTORIZADO", rotulo: "Autorizado" },
	{ valor: "PROPRIETARIO", rotulo: "Proprietário" },
	{ valor: "RESPONSAVEL_TECNICO", rotulo: "Responsável técnico" },
	{ valor: "TERCEIROS", rotulo: "Terceiros" },
] as const;

export type RelacaoInteressadoValor = (typeof RELACOES_INTERESSADO)[number]["valor"];

export const HORARIOS_PORTAL_PROCESSO = [
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
] as const;

export const DURACAO_PORTAL_PROCESSO_MINUTOS = 60;

export const SIGLA_COORDENADORIA_CAP = "CAP";

export function rotuloRelacaoInteressado(valor?: string | null): string {
	if (!valor) return "—";
	return RELACOES_INTERESSADO.find((r) => r.valor === valor)?.rotulo ?? valor;
}

export function rotuloConferenciaCap(status?: string | null): string {
	switch (status) {
		case "AGUARDANDO":
			return "Aguardando conferência da CAP";
		case "ENCAMINHADO":
			return "Encaminhado à coordenadoria";
		case "NAO_ENCONTRADO":
			return "Processo não localizado pela CAP";
		default:
			return "—";
	}
}

export function rotuloStatusAgendamentoPortal(params: {
	status: string;
	conferenciaCapStatus?: string | null;
}): string {
	if (params.conferenciaCapStatus === "AGUARDANDO") {
		return "Em conferência pela CAP";
	}
	if (params.conferenciaCapStatus === "NAO_ENCONTRADO" || params.status === "CANCELADO") {
		if (params.conferenciaCapStatus === "NAO_ENCONTRADO") {
			return "Processo não localizado";
		}
		return "Cancelado";
	}
	switch (params.status) {
		case "SOLICITADO":
			return params.conferenciaCapStatus === "ENCAMINHADO"
				? "Aguardando confirmação da coordenadoria"
				: "Aguardando confirmação";
		case "AGENDADO":
			return "Agendado";
		case "CONCLUIDO":
			return "Concluído";
		case "ATENDIDO":
			return "Atendido";
		case "NAO_REALIZADO":
			return "Não realizado";
		default:
			return params.status;
	}
}

export function mascararCpfInput(valor: string): string {
	const d = valor.replace(/\D/g, "").slice(0, 11);
	if (d.length <= 3) return d;
	if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
	if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascararTelefoneInput(valor: string): string {
	const d = valor.replace(/\D/g, "").slice(0, 11);
	if (d.length <= 2) return d;
	if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
	if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
	return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function somenteDigitos(valor: string): string {
	return valor.replace(/\D/g, "");
}
