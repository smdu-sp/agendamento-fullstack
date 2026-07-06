// Port fiel de AppService.verificaPagina/verificaLimite (agendamento_backend/src/app.service.ts),
// usado por todos os domínios de CRUD paginado (coordenadorias, divisoes, motivos, etc.).

export function verificaPagina(pagina: number, limite: number): [number, number] {
	if (!pagina) pagina = 1;
	if (!limite) limite = 10;
	if (pagina < 1) pagina = 1;
	if (limite < 1) limite = 10;
	return [pagina, limite];
}

export function verificaLimite(
	pagina: number,
	limite: number,
	total: number,
): [number, number] {
	if ((pagina - 1) * limite >= total) pagina = Math.ceil(total / limite);
	return [pagina, limite];
}
