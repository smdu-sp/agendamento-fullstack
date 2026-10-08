# 9. APIs e integrações

## Route handlers (HTTP)

Todas as rotas abaixo ficam sob `/agendamento`.

| Método e rota | Finalidade | Autenticação | Fonte |
|---|---|---|---|
| `GET/POST /api/auth/[...nextauth]` | Login, sessão e logout dos servidores (NextAuth) | — | [route.ts](../../app/api/auth/[...nextauth]/route.ts) |
| `POST /api/municipes/auth/cadastro` | Cria a conta do munícipe → `{ access_token }` | Pública | [route.ts](../../app/api/municipes/auth/[acao]/route.ts) |
| `POST /api/municipes/auth/login` | Login do munícipe → `{ access_token }` | Pública | idem |
| `POST /api/municipes/auth/solicitar-redefinicao-senha` | Gera o token de redefinição → `{ mensagem, linkRedefinicao? }` (o link só volta em ambiente local) | Pública | idem |
| `POST /api/municipes/auth/redefinir-senha` | Troca a senha com o token | Pública | idem |
| `POST /api/internal/teams-sync` | Processa a fila do Teams → `{ processadas, falhas }` | `Authorization: Bearer <TEAMS_SYNC_SECRET>` | [route.ts](../../app/api/internal/teams-sync/route.ts) |
| `GET /api/debug/time` | Hora, offset e fuso do servidor | **Pública** ⚠ | [route.ts](../../app/api/debug/time/route.ts) |

Formato dos erros nas rotas do munícipe: `{ message }`, com status HTTP 400, 401, 404, 409 ou 500.

### Corpos das requisições do munícipe

| Ação | Corpo JSON |
|---|---|
| `cadastro` | `{ nome, email, senha }` |
| `login` | `{ email, senha }` |
| `solicitar-redefinicao-senha` | `{ email }` |
| `redefinir-senha` | `{ token, novaSenha }` |

## Server Actions

A maior parte da API interna são Server Actions (`'use server'`), chamadas direto pelos componentes. Todas devolvem `{ ok, error, data, status }`.

| Domínio | Leituras (`query-functions`) | Escritas (`server-functions`) |
|---|---|---|
| [agendamentos](../../services/agendamentos/) | `buscarTudo`, `buscarDoDia`, `buscarPorId`, `getDashboard`, últimas importações, Arthur Saboya (via NestJS) | `criar`, `atualizar`, `excluir`, `importarPlanilha`, `importarPlanilhaOutlook`, `agendarReuniaoTeams`, `cancelarReuniaoTeams`, `sincronizarPresenca`, conferência CAP, agenda dos técnicos, portal de processos |
| [usuarios](../../services/usuarios/) | `buscarTudo`, `buscarPorId`, `buscarNovo` (AD), técnicos, `meuUsuario`, `validaUsuario`, lista completa | `criar`, `atualizar`, `desativar`, `autorizar` |
| [coordenadorias](../../services/coordenadorias/), [divisoes](../../services/divisoes/), [tipos-agendamento](../../services/tipos-agendamento/), [motivos](../../services/motivos/) | listar, buscar, lista completa | `criar`, `atualizar`, `desativar` |
| [configuracoes](../../services/configuracoes/) | `buscarConfiguracaoReunioes` | `atualizar`, `testarGraph` |

As Server Actions do portal recebem o **token do munícipe como primeiro parâmetro** (ex.: `criarSolicitacaoPortalProcesso(token, dados)`), já que a sessão do munícipe não usa cookie.

## Integrações externas

### LDAP / Active Directory

| Uso | Detalhe | Fonte |
|---|---|---|
| Login | Bind com `{login}{LDAP_DOMAIN}` e a senha do usuário | [lib/auth-core.ts](../../lib/auth-core.ts) |
| Busca de usuário | Bind com a conta de serviço, filtro `(&(sAMAccountName={login})(company=SMUL))`, atributos `name`, `mail` | [lib/ldap.ts](../../lib/ldap.ts) |

⚠ O login é colocado no filtro LDAP sem escape. Ver [riscos](11-pendencias-e-riscos.md).

### Microsoft Graph

Client credentials (`AZURE_*`); o token é guardado em memória até 60 s antes de expirar; timeout de 30 s por chamada ([lib/teams-graph.ts](../../lib/teams-graph.ts)).

| Função | Uso |
|---|---|
| `graphBuscarUsuario` | Testar a caixa organizadora |
| `graphCriarEventoTeams` / `graphAtualizarEventoTeams` / `graphCancelarEvento` | Ciclo da reunião (evento de calendário com reunião online) |
| `graphResolverMeetingId` | Achar o `meetingId` pelo link da reunião |
| `graphBuscarPresencas` | Relatórios de presença |
| `graphEnviarEmail` | Avisos de falha aos pontos focais |

Permissões de aplicativo: `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite.All`, `OnlineMeetingArtifact.Read.All`, `Mail.Send`, mais Application Access Policy na caixa organizadora.

### BI (SQL Server)

Leitura de comunique-se e despachos. Ver [06-banco-de-dados.md](06-banco-de-dados.md#bi) e [portal-processos-e-bi.md](08-regras-de-negocio/portal-processos-e-bi.md). As consultas usam parâmetros (`@numero`).

### SGU (MySQL legado)

Inferência da divisão pelo login de rede, com falhas ignoradas. Ver [06-banco-de-dados.md](06-banco-de-dados.md#sgu).

### Socket.IO

O custom server ([server.ts](../../server.ts)) sobe um servidor Socket.IO com CORS (`CORS_ORIGIN`) mas **sem eventos implementados**. O chat em tempo real dos pré-projetos hoje conecta no Socket.IO do backend NestJS. Ver [12-migracao-nestjs.md](12-migracao-nestjs.md).

### Backend NestJS (transitório)

Ver [12-migracao-nestjs.md](12-migracao-nestjs.md). Será descontinuado.
