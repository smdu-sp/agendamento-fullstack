# 7. Autenticação e autorização

O sistema tem dois públicos com mecanismos independentes: **servidores** (NextAuth) e **munícipes** (JWT próprio).

## Servidores
### Login

Fluxo em [lib/auth/auth.config.ts](../../lib/auth/auth.config.ts) e [lib/auth-core.ts](../../lib/auth-core.ts):

1. O usuário informa **login de rede** e **senha** em `/login`.
2. O usuário precisa existir em `usuarios` com `status = true`.
3. Validação da senha:
   - se o usuário tem `senha` local (ex.: Portaria) → `bcrypt.compare`;
   - senão, se `ENVIRONMENT=local` → aceita sem validar;
   - senão → *bind* LDAP com `login + LDAP_DOMAIN`.
4. São emitidos um **access token** (15 min, `JWT_SECRET`) e um **refresh token** (7 dias, `RT_SECRET`), com `sub`, `login`, `nome`, `nomeSocial`, `email`, `status`, `avatar` e `permissao`.
5. Os tokens ficam na sessão JWT do NextAuth (cookie). No callback `jwt`, o access token expirado é renovado com o refresh token, se o usuário continuar ativo.
6. `ultimoLogin` é atualizado no login e em cada renovação.

### Proteção de rotas

- Não há `middleware`/`proxy`.
- [app/(rotas-auth)/layout.tsx](../../app/(rotas-auth)/layout.tsx) redireciona para `/login` sem sessão; [app/(rotas-livres)/layout.tsx](../../app/(rotas-livres)/layout.tsx) redireciona usuários logados para `/`.
- Cada página sensível checa o perfil (ex.: [configuracoes/page.tsx](../../app/(rotas-auth)/configuracoes/page.tsx), [agenda-tecnicos/page.tsx](../../app/(rotas-auth)/agenda-tecnicos/page.tsx)).
- **Cada Server Action valida o perfil de novo** com [lib/authz.ts](../../lib/authz.ts). A checagem no servidor é a que vale; a tela apenas esconde opções.

### `lib/authz.ts`

| Função | Comportamento |
|---|---|
| `getSessionUsuario()` | Lê a sessão, recarrega o usuário do banco (com divisão e coordenadoria) e aplica a personificação |
| `requireUsuario()` | Sem sessão → `AuthzError 401` (usada em leituras) |
| `requireUsuarioOuRedirect()` | Sem sessão → redireciona para `/login` (usada em escritas) |
| `verificarPermissoes(usuario, perfis)` | Passa se o perfil efetivo estiver na lista; **DEV sempre passa** (real ou personificado) |

### Personificação (DEV)

Um usuário **DEV** pode agir como outro perfil pelo seletor da interface ([components/impersonation-selector.tsx](../../components/impersonation-selector.tsx)), que grava o cookie `impersonate_permissao`. Perfis aceitos: DEV, ADM, TEC, USR, PONTO_FOCAL, COORDENADOR, PORTARIA. O perfil real fica em `permissaoReal`.

As verificações de página usam o perfil da sessão (o real). As Server Actions usam o perfil efetivo.

## Perfis

| Perfil | Descrição | Escopo de dados |
|---|---|---|
| `DEV` | Desenvolvedor | Tudo. Se tiver divisão, a lista é filtrada pela coordenadoria; pode ser atribuído como técnico se tiver divisão |
| `ADM` | Administrador | Tudo |
| `COORDENADOR` | Coordenador | Agendamentos da sua coordenadoria |
| `PONTO_FOCAL` | Ponto focal | Agendamentos da sua divisão, mais os da coordenadoria ainda sem técnico, mais os da divisão Arthur Saboya na coordenadoria |
| `DIRETOR` | Diretor de divisão | Agendamentos da sua divisão (só leitura, dashboard e agenda) |
| `TEC` | Técnico | Os próprios agendamentos. Técnicos lotados na divisão Arthur Saboya veem também os da divisão |
| `PORTARIA` | Recepção | Lista de agendamentos (leitura) |
| `ARTHUR_SABOYA` | Técnico da Sala Arthur Saboya | Pedidos de pré-projetos |
| `ADM_ARTHUR_SABOYA` | Administrador local da Sala Arthur Saboya | Pedidos de pré-projetos |
| `USR` | Usuário sem função | Nenhum conteúdo ("Você não tem permissão para visualizar conteúdo") |

Escopos implementados em [services/agendamentos/query-functions/buscar-tudo.ts](../../services/agendamentos/query-functions/buscar-tudo.ts) e [lib/agendamentos-core.ts](../../lib/agendamentos-core.ts) (`escopoListaAgendamentosParaTec`).

## Matriz de permissões das ações

Legenda: ● permitido · ◐ permitido com restrição · — negado. DEV passa em todas.

| Ação | ADM | COORD | PF | DIRETOR | TEC | PORTARIA |
|---|---|---|---|---|---|---|
| Listar / agenda do dia | ● | ◐ coord. | ◐ divisão | ◐ divisão | ◐ próprios | ● |
| Ver detalhe por ID | ● | ● ⚠ | ● ⚠ | ● ⚠ | ● ⚠ | ● |
| Criar agendamento interno (Server Action sem tela) | ● | — | — | — | — | — |
| Cancelar agendamento (excluir) | ● | — | — | — | — | — |
| Atualizar agendamento (atribuir, remarcar, confirmar, status) | ● | ◐ coord. | ◐ coord. | — | ◐ só resultado do próprio atendimento¹ | — |
| Criar / cancelar reunião Teams⁴ | ● | ◐ coord. | ◐ coord. | — | — | — |
| Sincronizar presença | ● | ◐ coord. | ◐ coord. | — | ◐ próprios | — |
| Importar planilhas | ● | — | — | — | — | — |
| Dashboard | ● | ◐ | ◐ | ◐ | — | — |
| Agenda dos técnicos (regras/ausências) | ● | ◐ coord. | ◐ coord. | ◐ coord. | ◐ consultar a própria disponibilidade | — |
| Conferência CAP | ● | ◐ só da CAP² | ◐ só da CAP² | — | — | — |
| Usuários: listar, buscar na rede, criar, editar, desativar | ● | ◐ própria divisão³ | ◐ própria divisão³ | — | ⚠ editar: ver riscos | — |
| Reativar usuário (`autorizar`) / listar todos os técnicos | ● | — | — | — | — | — |
| Coordenadorias, divisões: ver | ● | ● | ● | — | — | — |
| Coordenadorias, divisões, tipos: alterar | ● | — | — | — | — | — |
| Motivos: criar | ● | ● | ● | — | — | — |
| Motivos: listar no cadastro, editar, desativar | ● | — | — | — | — | — |
| Configurações: ver / editar e testar | ● / ● | ● / — | ● / — | — | — | — |

1. TEC só altera `status` (ATENDIDO, NAO_REALIZADO, CONCLUIDO) e `motivoNaoAtendimentoId` de agendamentos em que é o técnico ([atualizar.ts](../../services/agendamentos/server-functions/atualizar.ts)).
2. PF/COORD lotados em divisão cuja coordenadoria tem sigla `CAP` ([lib/conferencia-cap-acesso.ts](../../lib/conferencia-cap-acesso.ts)).
3. Regras dos usuários:
   - **Perfis permitidos**: PF/COORD só atribuem USR, PONTO_FOCAL e TEC, e o novo usuário fica na divisão de quem criou ([lib/usuarios-core.ts](../../lib/usuarios-core.ts), [criar.ts](../../services/usuarios/server-functions/criar.ts)). O formulário também oferece Diretor e os perfis Arthur Saboya a PF/COORD ([form-usuario.tsx](../../app/(rotas-auth)/usuarios/_components/form-usuario.tsx)), mas o servidor recusa com 403.
   - **ADM criando DEV**: o usuário é gravado como ADM.
   - **Perfis Arthur Saboya**: são lotados automaticamente na divisão do fluxo.
   - **Listagem**: só é filtrada pela divisão se o PF/COORD **tiver** divisão. Sem divisão, a lista não é filtrada ([usuarios/query-functions/buscar-tudo.ts](../../services/usuarios/query-functions/buscar-tudo.ts)).
   - **Edição e desativação**: exigem que o alvo seja da mesma divisão ([atualizar.ts](../../services/usuarios/server-functions/atualizar.ts), [desativar.ts](../../services/usuarios/server-functions/desativar.ts)).
   - **Busca na rede** (`buscarNovo`): se o login já existe e está inativo, a busca **reativa** o usuário ([buscar-novo.ts](../../services/usuarios/query-functions/buscar-novo.ts)).

4. "Cancelar reunião" também **cancela o agendamento** (status `CANCELADO`), exigindo motivo com no mínimo 5 caracteres ([lib/agendamentos-teams.ts](../../lib/agendamentos-teams.ts), `cancelarReuniaoTeamsInterno`).

⚠ `buscarPorId` só confere o perfil, não o escopo: qualquer perfil da lista abre o detalhe de qualquer agendamento se souber o ID ([buscar-por-id.ts](../../services/agendamentos/query-functions/buscar-por-id.ts)). Ver [riscos](11-pendencias-e-riscos.md).

Pedidos Arthur Saboya (tela interna): DEV, ADM, TEC, ARTHUR_SABOYA, ADM_ARTHUR_SABOYA, COORDENADOR e PONTO_FOCAL ([lib/pedidos-pre-projetos-arthur-saboya-acesso.ts](../../lib/pedidos-pre-projetos-arthur-saboya-acesso.ts)). A filtragem das operações ainda ocorre no backend NestJS.

## Menu por perfil

[components/sidebar/nav-main.tsx](../../components/sidebar/nav-main.tsx):

| Grupo | Itens | Perfis |
|---|---|---|
| Geral | Página Inicial, Agendamentos | Todos |
| Geral | Pedidos Arthur Saboya | Ver acima |
| Geral | Conferência CAP | Regra da CAP |
| Administração / Coordenadoria / Divisão | Dashboard, Agenda dos técnicos | DEV, ADM, PF, COORD, DIRETOR |
| | Usuários | DEV, ADM, PF, COORD |
| | Configurações | PF, COORD (DEV/ADM pelo grupo admin) |
| | Coordenadorias, Divisões, Tipos de Agendamento, Motivos, Configurações, Importar Agendamentos, Importar Outlook | DEV, ADM |
| Páginas Externas, Ferramentas DEV | Links do portal, Preview de e-mails | DEV |

## Munícipes

- **Endpoints**: `POST /api/municipes/auth/{cadastro|login|solicitar-redefinicao-senha|redefinir-senha}` ([route.ts](../../app/api/municipes/auth/[acao]/route.ts), [lib/municipes-auth-core.ts](../../lib/municipes-auth-core.ts)).
- **Cadastro**: nome, e-mail válido e único (normalizado em minúsculas), senha com no mínimo 6 caracteres (bcrypt, custo 10).
- **Token**: JWT HS256 com `escopo: "MUNICIPE"`, validade de 7 dias, assinado com `JWT_SECRET`. Guardado no **localStorage** do navegador ([lib/municipe-sessao.ts](../../lib/municipe-sessao.ts)) e enviado às Server Actions do portal como parâmetro.
- **Validação no servidor**: `requireMunicipeFromToken` confere a assinatura, o escopo e se a conta existe e está ativa ([lib/auth-municipe.ts](../../lib/auth-municipe.ts)).
- **Redefinição de senha**:
  - resposta genérica, para não revelar se o e-mail existe;
  - token aleatório de 32 bytes, guardado como SHA-256, válido por 60 minutos e de uso único;
  - tokens anteriores não usados são apagados.
  - Em ambiente local o link volta na própria resposta.
  - **Pendente de confirmação**: Em produção o link **não é enviado por e-mail por este código**. Confirmar como o munícipe recebe o link.

## Observações de segurança

Ver [11-pendencias-e-riscos.md](11-pendencias-e-riscos.md).
