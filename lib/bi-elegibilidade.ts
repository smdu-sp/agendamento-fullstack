/** Regras atuais de elegibilidade de recursos consultados no BI. */
export function elegivelComuniqueSe(_situacao: string | null | undefined): boolean {
	// Regra provisória: todas as situações de comunique-se permitem solicitação.
	return true;
}

export function elegivelDespacho(situacao: string | null | undefined): boolean {
	return (situacao ?? "").trim().toLocaleLowerCase("pt-BR") === "indeferido";
}
