# 2. Estrutura de pastas

```
.
├── app/                      # App Router (Next.js)
│   ├── (rotas-auth)/         # área interna — layout exige sessão de servidor
│   ├── (rotas-livres)/       # login de servidores — layout redireciona logados para /
│   ├── _portal/              # telas do portal do munícipe (pasta privada, não roteável)
│   ├── portal/ processos/ consulta/ pre-projetos/ perguntas-frequentes/
│   │                         # rotas públicas que reexportam as telas de _portal
│   ├── api/                  # route handlers
│   ├── layout.tsx            # providers globais (Auth, Impersonation, Query, Theme)
│   └── globals.css
├── components/               # componentes compartilhados
│   ├── ui/                   # shadcn/ui
│   ├── sidebar/              # menu lateral (itens por perfil em nav-main.tsx)
│   └── arthur-saboya/        # cabeçalho, rodapé, cards e chat do portal
├── services/<dominio>/       # Server Actions por domínio
│   ├── query-functions/      # leituras
│   ├── server-functions/     # escritas
│   └── index.ts              # reexporta as funções
├── lib/                      # regras de negócio, autenticação, integrações
├── types/                    # interfaces TypeScript compartilhadas
├── providers/                # React providers
├── hooks/
├── prisma/
│   ├── schema.prisma         # banco principal
│   ├── migrations/           # migrações versionadas
│   └── sgu/schema.prisma     # client do SGU (legado)
├── scripts/                  # scripts avulsos (ver riscos)
├── tests/                    # testes node:test
├── design-prototype/         # protótipo visual exportado (fora do build)
├── server.ts                 # custom server (Next + Socket.IO)
├── Dockerfile / docker-compose.yml
└── example.env               # modelo de variáveis
```

## Rotas da área interna — `app/(rotas-auth)/`

| Rota | Tela |
|---|---|
| `/` | Agendamentos (padrão: data de hoje) |
| `/agendamentos`, `/agendamentos/[id]` | Lista e detalhe |
| `/agendamentos-fisicos` | Redireciona para `/agendamentos` |
| `/agenda-tecnicos` | Agenda e ausências dos técnicos |
| `/conferencia-cap` | Fila da CAP |
| `/dashboard` | Indicadores |
| `/pedidos-pre-projetos-arthur-saboya`, `/[slug]` | Pedidos e chamado Arthur Saboya |
| `/municipes` | Contas do portal (munícipes): editar, ativar/desativar, resetar senha |
| `/usuarios`, `/coordenadorias`, `/divisoes`, `/tipos-agendamento`, `/motivos` | Cadastros |
| `/importar-planilha`, `/importar-agendamentos-outlook` | Importações |
| `/configuracoes` | Configuração do Teams |
| `/perfil` | Perfil do usuário |
| `/dev/email-preview` | Ferramenta exclusiva de DEV |

## Rotas públicas (portal)

| Rota | Tela | Origem |
|---|---|---|
| `/portal` | Página inicial do portal | [app/_portal/page.tsx](../../app/_portal/page.tsx) |
| `/portal/acesso`, `/portal/cadastro`, `/portal/esqueci-senha`, `/portal/redefinir-senha` | Conta do munícipe | [app/portal/](../../app/portal/) |
| `/processos` | Agendamento por processo | [app/_portal/processos/](../../app/_portal/processos/) |
| `/consulta`, `/consulta/[id]` (também `/portal/consulta`) | Consulta de agendamentos e chamados | [app/_portal/consulta/](../../app/_portal/consulta/) |
| `/pre-projetos` | Pedido de orientação (Arthur Saboya) | [app/_portal/pre-projetos/page.tsx](../../app/_portal/pre-projetos/page.tsx) |
| `/perguntas-frequentes` | FAQ | [app/_portal/perguntas-frequentes/page.tsx](../../app/_portal/perguntas-frequentes/page.tsx) |

Todas as rotas ficam sob o `basePath` **`/agendamento`** ([next.config.ts](../../next.config.ts)).

## Principais módulos de `lib/`

| Arquivo | Responsabilidade |
|---|---|
| `authz.ts`, `auth-core.ts`, `auth/` | Sessão, tokens, LDAP, personificação, checagem de perfis |
| `auth-municipe.ts`, `municipes-auth-core.ts`, `municipe-sessao.ts` | Contas e sessão do munícipe |
| `agendamentos-core.ts` | Helpers do domínio (técnico por RF, máscaras, escopo de listagem) |
| `agendamento-transicoes.ts` | Máquina de estados do status |
| `agenda-slots.ts`, `agenda-tecnicos.ts` | Agenda recorrente, ausências, slots, bloqueio |
| `portal-processos-core.ts`, `portal-processos-constantes.ts` | Agendamento pelo portal |
| `bi-processos.ts`, `bi-elegibilidade.ts` | Consulta e elegibilidade no BI |
| `agendamentos-teams.ts`, `teams-graph.ts`, `reuniao-teams-titulos.ts`, `outlook-agendamento-teams.ts` | Teams, presença, e-mails |
| `agendamentos-import.ts` | Importação de planilhas |
| `usuarios-core.ts`, `ldap.ts`, `prisma-sgu.ts` | Usuários, AD e SGU |
| `conferencia-cap-acesso.ts`, `pedidos-pre-projetos-arthur-saboya-acesso.ts`, `arthur-saboya-perfis.ts` | Regras de acesso por perfil |
