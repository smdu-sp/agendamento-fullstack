// Mesmo shape de `selectUsuarioSemSenha` em usuarios.service.ts do backend.
// Fonte única usada por lib/authz.ts e pelos services de usuários.
export const SELECT_USUARIO_SEM_SENHA = {
	id: true,
	nome: true,
	login: true,
	email: true,
	permissao: true,
	status: true,
	avatar: true,
	ultimoLogin: true,
	criadoEm: true,
	atualizadoEm: true,
	nomeSocial: true,
	divisaoId: true,
	divisao: {
		select: {
			id: true,
			sigla: true,
			nome: true,
			coordenadoriaId: true,
			coordenadoria: { select: { id: true, sigla: true, nome: true } },
		},
	},
} as const;
