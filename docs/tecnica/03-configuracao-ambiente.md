# 3. Configuração do ambiente

As variáveis são lidas de `.env` (via `dotenv/config` em [server.ts](../../server.ts)). Use [example.env](../../example.env) como modelo. **Nunca versione `.env`** — ele já está em `.gitignore` e `.dockerignore`.

> Esta página lista apenas nomes e finalidades. Valores e credenciais devem ser obtidos com a equipe responsável pelo ambiente.

## Variáveis usadas pelo código
### Aplicação

| Variável | Obrigatória | Uso | Onde |
|---|---|---|---|
| `PORT` | Não (padrão 3001) | Porta do custom server | [server.ts](../../server.ts) |
| `NODE_ENV` | Definida pelos scripts | `development`/`production` | [package.json](../../package.json) |
| `NEXT_PUBLIC_BASE_PATH` | Não | Prefixo usado em URLs do NextAuth e da API do munícipe. **O `basePath` do Next é fixo em `/agendamento`** em [next.config.ts](../../next.config.ts) | [lib/auth/auth.ts](../../lib/auth/auth.ts), [lib/api-url.ts](../../lib/api-url.ts) |
| `NEXT_PUBLIC_PROJECT_NAME` | Pendente de confirmação | Presente no modelo; uso não localizado no código | — |
| `FRONTEND_URL` | Recomendada | URL pública para links em e-mails (redefinição de senha, avisos de falha do Teams) | [lib/municipes-auth-core.ts](../../lib/municipes-auth-core.ts), [lib/agendamentos-teams.ts](../../lib/agendamentos-teams.ts) |
| `CORS_ORIGIN` | Não | Origens aceitas pelo Socket.IO (lista separada por vírgula) | [server.ts](../../server.ts) |
| `ENVIRONMENT` | Não | `local` **desativa o LDAP** (qualquer senha é aceita para usuários sem senha local) e expõe o link de redefinição de senha na resposta | [lib/auth-core.ts](../../lib/auth-core.ts), [lib/municipes-auth-core.ts](../../lib/municipes-auth-core.ts) |

### Autenticação

| Variável | Uso |
|---|---|
| `AUTH_SECRET` | Segredo do NextAuth (cookie de sessão) |
| `AUTH_URL` | Opcional; força a URL do NextAuth (com `trustHost: true` normalmente não é necessária) |
| `JWT_SECRET` | Assina o access token dos servidores (15 min) e o token do munícipe (7 dias) |
| `RT_SECRET` | Assina o refresh token dos servidores (7 dias) |

### Bancos de dados

| Variável | Uso |
|---|---|
| `DATABASE_URL` | MySQL principal (Prisma) |
| `DATABASE_URL_DOCKER` | URL usada pelo serviço `app` do Docker Compose |
| `SGU_DATABASE_URL` | SGU legado (leitura, best-effort) |
| `BI_DATABASE_URL` | BI em SQL Server, formato `sqlserver://host:porta;database=...;user=...;password=...;encrypt=...;trustServerCertificate=...` ([lib/bi-processos.ts](../../lib/bi-processos.ts)) |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PORT` | Apenas para o MySQL do Docker Compose |

### LDAP / Active Directory

| Variável | Uso |
|---|---|
| `LDAP_SERVER` | URL do servidor LDAP |
| `LDAP_DOMAIN` | Sufixo concatenado ao login no bind |
| `LDAP_BASE` ou `LDAP_BASE_DN` | Base de busca (o código aceita os dois nomes) |
| `USER_LDAP`, `PASS_LDAP` | Conta de serviço usada para buscar usuários |

### Microsoft Graph / Teams

| Variável | Uso |
|---|---|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | Aplicação Azure (client credentials). Permissões de aplicativo: `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite.All`, `OnlineMeetingArtifact.Read.All`, `Mail.Send`, e Application Access Policy na caixa organizadora |
| `TEAMS_SYNC_SECRET` | Bearer token exigido por `POST /api/internal/teams-sync` |

O e-mail da caixa organizadora **não** é variável de ambiente: fica na tabela `configuracoes_sistema` (chave `TEAMS_ORGANIZER_EMAIL`), editável em **Configurações**, com padrão definido em [lib/reuniao-teams-titulos.ts](../../lib/reuniao-teams-titulos.ts).

### Fluxo Arthur Saboya

| Variável | Uso |
|---|---|
| `DIVISAO_ID_PRE_PROJETOS`, `NEXT_PUBLIC_DIVISAO_ID_PRE_PROJETOS` | UUID da divisão da Sala Arthur Saboya (mesmo valor nas duas) |
| `COORDENADORIA_ID_PRE_PROJETOS` | UUID da coordenadoria do fluxo ([lib/agendamentos-core.ts](../../lib/agendamentos-core.ts)) |

### Transitórias (backend NestJS — serão removidas)

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL` | URL do backend NestJS ([lib/api-url.ts](../../lib/api-url.ts)) |
| `NEXT_PUBLIC_AGENDAMENTOS_API_URL` | Alternativa usada no envio público de pré-projeto |

Ver [12-migracao-nestjs.md](12-migracao-nestjs.md).

## Divergências entre `example.env` e o código

> **Pendente de confirmação.**

| Item | Situação |
|---|---|
| `TEAMS_SYNC_SECRET`, `COORDENADORIA_ID_PRE_PROJETOS`, `LDAP_BASE_DN`, `NEXT_PUBLIC_AGENDAMENTOS_API_URL` | Usadas no código, ausentes do `example.env` |
| `MAIL_API_URL`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE`, `MAIL_FROM` | Presentes no `example.env`, sem uso neste código (e-mails saem pelo Graph). Provavelmente usadas pelo NestJS |
| `SHADOW_DATABASE_URL` | Presente no `example.env`; o `schema.prisma` não declara `shadowDatabaseUrl` |
| Comentário do BI | O `example.env` cita `dbo.ComuniqueSes` e `dbo.Despachos`; o código consulta `dbo.prata_comuniquese` e `dbo.prata_despacho` |

## Variáveis de build

`NEXT_PUBLIC_*` são embutidas no bundle em tempo de build. O [Dockerfile](../../Dockerfile) recebe `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_BASE_PATH` como `ARG`.
