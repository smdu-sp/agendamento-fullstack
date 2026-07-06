// Mesmo shape de `selectDivisao` em divisoes.service.ts do backend.
export const SELECT_DIVISAO = {
	id: true,
	sigla: true,
	nome: true,
	status: true,
	criadoEm: true,
	atualizadoEm: true,
	coordenadoriaId: true,
	coordenadoria: { select: { id: true, sigla: true, nome: true } },
} as const;
