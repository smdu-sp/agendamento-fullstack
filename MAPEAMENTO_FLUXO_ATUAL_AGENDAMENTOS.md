# Etapa 1 — Mapeamento do fluxo atual

Inspeção estática realizada em 21/09/2026. Entrega do item 1 do plano de atualização: identificar os percursos existentes, contratos e pontos de escrita para adequá-los sem refazer o sistema.

## 1. Escopo e resultado

Foram inspecionados o projeto `Agendamento-FullStack` e, somente para leitura, o projeto vizinho `../agendamento_backend`. O backend NestJS que implementa o Arthur Saboya foi localizado. Não é necessário recriar seus endpoints.

Não foram alterados código executável, schemas ou bancos. Não foram feitas chamadas ao BI, Graph ou APIs em execução. Não foram lidos os valores do `.env`. A existência do código local não comprova qual versão está publicada nem se os dois processos usam o mesmo banco no ambiente ativo.

Não foram encontrados arquivos `AGENTS.md` nas buscas realizadas dentro dos dois projetos.

## 2. Responsabilidades existentes

| Responsabilidade | Implementação localizada | Como aproveitar |
|---|---|---|
| Páginas e componentes | `app/`, `components/`, `types/` | Alterar os componentes utilizados pelas rotas existentes. |
| Agendamentos gerais e processos | Server Actions em `services/agendamentos/server-functions/`, regras em `lib/` | Concentrar adequações nos pontos atuais de consulta/criação/atualização. |
| Persistência local | `lib/prisma.ts`, `prisma/schema.prisma` — MySQL | Evoluir schema e consultas preservando dados e consumidores. |
| Consulta BI | `lib/bi-processos.ts` — SQL Server via `mssql` | Reutilizar conexão, parâmetros e tratamento de falhas. |
| Identificação de técnico | `lib/agendamentos-core.ts`, `lib/usuarios-core.ts`, LDAP/SGU | Validar RF/login e aproveitar o vínculo de unidade existente. |
| Teams | `lib/agendamentos-teams.ts`, `lib/teams-graph.ts` | Adequar os serviços atuais e seus disparadores. |
| Chamados Arthur Saboya | `../agendamento_backend/src/agendamentos/agendamentos.controller.ts` e `agendamentos.service.ts` | Ajustar as operações existentes de chamado, encaminhamento, atribuição e mensagens. |
| Chat em tempo real | `lib/pre-projeto-chat-realtime.ts` → `../agendamento_backend/src/agendamentos/pre-projeto-chat.gateway.ts` | Preservar os eventos e a atualização das telas. |
| Autenticação interna | `lib/authz.ts`, NextAuth; guards/decorators no NestJS | Manter autenticação e revisar escopo nas operações alteradas. |
| Autenticação munícipe | `app/api/municipes/auth/[acao]/route.ts`, `lib/auth-municipe.ts`; guard de munícipe no NestJS | Preservar contratos do token e propriedade dos registros. |

`services/agendamentos/index.ts` reúne tanto Server Actions locais quanto wrappers HTTP externos. O nome do diretório `query-functions` não significa somente leitura: ali também existem POSTs de mutação de chamados.

## 3. Rotas e seus consumidores

Todas as rotas Next.js abaixo são relativas ao `basePath` `/agendamento`.

| Entrada | Implementação/consumidor | Destino principal |
|---|---|---|
| `/processos` | Reexporta `app/_portal/processos/page.tsx`; formulário em `_components/form-agendamento-processo.tsx` | `validarProcessoPortal`, `criarSolicitacaoPortalProcesso` locais. |
| `/pre-projetos` | Reexporta `app/_portal/pre-projetos/page.tsx` | POST externo `agendamentos/publico/pre-projetos`. |
| `/consulta` e `/portal/consulta` | Reexportam `app/_portal/consulta/page.tsx` | Lista de processos por Server Action e lista de chamados por HTTP. |
| `/consulta/[id]` e `/portal/consulta/[id]` | Componentes do detalhe em `app/_portal/consulta/[id]/page.tsx` | Detalhe/mensagens/ações do chamado pelo backend. |
| `/agendamentos`, `/agendamentos-fisicos` e detalhes | Listas/detalhes em `app/(rotas-auth)/`; componentes compartilhados em `_components/` | Consulta local; atribuição e atendimento via wrapper de atualização local. |
| `/conferencia-cap` | `_components/lista-conferencia-cap.tsx` | `listarConferenciaCap`, `encaminharConferenciaCap`, `recusarConferenciaCap`. |
| `/pedidos-pre-projetos-arthur-saboya` e `/[slug]` | Listas e `chamado-pre-projeto-portal-view.tsx` | Wrappers HTTP Arthur, atualização local e diálogo Teams local. |
| `/importar-planilha` | `importar-planilha-form.tsx` | Server Action `importarPlanilha`. |
| `/importar-agendamentos-outlook` | `importar-agendamentos-outlook-form.tsx` | Server Action `importarPlanilhaOutlook`. |
| `/dashboard` e página inicial interna | Consultas em `services/agendamentos/query-functions/` | Prisma local; preservar filtros e contagens quando estados forem ajustados. |

`services/agendamentos/client-functions/atualizar.ts` já encaminha a chamada para a Server Action. Seu argumento de token é mantido por compatibilidade, mas a sessão interna é resolvida no servidor.

## 4. Percurso de atendimento por processo

1. Formulário autentica o munícipe e coleta CPF, telefone, processo/protocolo, tipo e relação com o interessado.
2. `validarProcessoPortal(token, numeroProcesso)` exige sessão e chama `validarNumeroProcessoPortal`.
3. `consultarProcessoNoBi` pesquisa nas tabelas atuais, consolida a elegibilidade e escolhe uma ocorrência de referência.
4. `mapearUnidadeBi` procura divisão/coordenadoria pelas variantes da sigla.
5. O formulário oferece horários fixos de `lib/portal-processos-constantes.ts`.
6. `criarSolicitacaoPortalProcesso` chama `criarAgendamentoPortalProcesso`, que consulta o BI novamente, verifica duplicidade e grava `Agendamento` em `SOLICITADO`.
7. Sem elegibilidade ou unidade mapeada, o caminho atual pode seguir para conferência CAP após confirmação do usuário.
8. CAP encaminha ou recusa; ponto focal atribui técnico pela atualização existente. A atribuição pode disparar Teams.
9. O munícipe acompanha e cancela pelo serviço local, com filtro por `municipeContaId`.

**Contrato atual de criação:** `DadosCriacaoPortalProcesso` contém `cpf`, `telefone`, `processo`, `tipoAgendamentoTexto`, `relacaoInteressado`, `data`, `hora`, `confirmadoProcessoAusente?`. Não contém identidade de ocorrência, dúvida livre, modalidade ou slot por técnico.

**Resposta de validação atual:** `ResultadoBiProcesso` retorna flags (`encontrado`, `comuniqueSeAberto`, `indeferido`, `elegivelAutomatico`, `erroBi?`) e uma referência de processo/protocolo/unidade/situação. A camada de portal acrescenta IDs e siglas da unidade mapeada. Mudar para lista de ocorrências exige atualizar o formulário e a confirmação juntos.

## 5. Pontos de escrita locais

Os caminhos abaixo devem ser considerados antes de centralizar uma regra; não basta alterar o formulário público.

| Operação | Entrada e ponto de escrita | Comportamento/efeito atual |
|---|---|---|
| Criar recurso | `server-functions/portal-processos.ts` → `lib/portal-processos-core.ts:218` | Cria agendamento, vincula munícipe, registra flags BI e conferência CAP. |
| Criar interno | `server-functions/criar.ts:19` / `:72` | ADM/DEV; verifica processo+início, grava diretamente; status inicial depende de existir processo. Exportado; não foi localizada tela que o invoque diretamente nas buscas de consumidores. |
| Atribuir técnico | `atribuir-tecnico.tsx` → wrapper → `server-functions/atualizar.ts:28` | Atualiza técnico/RF/divisão; pode disparar Teams na primeira atribuição. |
| Alterar horário/status/dados | `confirmar-atendimento.tsx`, detalhe Arthur → `server-functions/atualizar.ts` | Grava payload de atualização; recalcula término; pode atualizar status/mensagem do chamado. |
| Encaminhar CAP | `server-functions/conferencia-cap.ts:42` | Atualiza unidade e situação de conferência. |
| Recusar CAP | `server-functions/conferencia-cap.ts:100` | Cancela solicitação e registra observação da CAP. |
| Cancelar pelo portal | `server-functions/portal-processos.ts:98` | Exige propriedade; confirmado tem antecedência atual de 24h; com evento chama serviço Teams, sem evento grava cancelamento local. |
| Excluir interno | `server-functions/excluir.ts:10` | ADM/DEV; exclusão física. Exportado; não foi localizado botão consumidor direto nas buscas. |
| Importar planilha | `server-functions/importar-planilha.ts` → `lib/agendamentos-import.ts:487` | Grava diretamente e prepara IDs para criação de reuniões; reserva fica sem técnico para atribuição manual. |
| Importar Outlook | `server-functions/importar-planilha-outlook.ts` → `lib/agendamentos-import.ts:738` | Outro ponto de criação direta; deve participar da futura verificação de conflitos. |
| Criar Teams | `server-functions/agendar-reuniao-teams.ts` → `lib/agendamentos-teams.ts:243` | Atualiza IDs/link/status e, quando aplicável, chamado e mensagem de sistema. Também chamado por atribuição/importação. |
| Cancelar Teams | `server-functions/cancelar-reuniao-teams.ts` → `lib/agendamentos-teams.ts:448` | Cancela evento e grava cancelamento; falha remota atualmente interrompe antes da gravação local. |
| Sincronizar presença | `server-functions/sincronizar-presenca.ts` → `lib/agendamentos-teams.ts:501` | Grava presença e atualiza status/sincronização. É escritor de status, mesmo sendo apresentado como sincronização. |
| Criação remota avulsa | `scripts/criar-reunioes-teams-lote.ts` | Script com lista fixa que faz POST diretamente no Graph. Não usa Prisma nem o serviço compartilhado: não é um executor genérico de pendências do Portal. |

Linhas são referências da versão inspecionada. `server-functions/` nesta tabela significa `services/agendamentos/server-functions/`.

## 6. Arthur Saboya: contrato HTTP já implementado

Base externa: `lib/api-url.ts` usa `INTERNAL_API_URL` no servidor, com fallback para `NEXT_PUBLIC_API_URL`; no navegador usa `NEXT_PUBLIC_API_URL`. A abertura do formulário usa diretamente `NEXT_PUBLIC_AGENDAMENTOS_API_URL` com fallback para `NEXT_PUBLIC_API_URL`. Verificar equivalência desses destinos na homologação.

Prefixos usados na tabela: `P = agendamentos/municipes/pre-projetos-chamados`; `I = agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal`.

| Método/caminho | Entrada | Implementação em `agendamentos.service.ts` do NestJS |
|---|---|---|
| POST `agendamentos/publico/pre-projetos` | Nome, e-mail, formação/outro, natureza/outro, descrição; bearer quando disponível | `criarSolicitacaoPreProjetos:588`: protocolo, chamado e primeira mensagem em transação; envia e-mail depois. |
| GET `P` | Paginação, bearer munícipe | `listarMinhasSolicitacoesPreProjetosMunicipe:718`. |
| GET `P/:id` | UUID, bearer munícipe | `obterSolicitacaoDetalheMunicipe:731`. |
| POST `P/:id/mensagens` | `{ texto }` | `adicionarMensagemMunicipeNaSolicitacao:747`. |
| POST `P/:id/marcar-solucionado` | ID | `marcarSolicitacaoMunicipeComoSolucionada:788`. |
| POST `P/:id/avaliacao` | `{ nota, comentario? }` | `avaliarSolicitacaoPreProjetoMunicipe:982`. |
| POST `P/:id/cancelar-atendimento` | ID | `cancelarAtendimentoSolicitacaoMunicipe:907`. |
| GET `I/buscar-tudo` | Paginação, busca, status, bearer interno | `buscarSolicitacoesPreProjetosPortalArthurSaboya:1293`. |
| GET `I/:id` | UUID ou protocolo | `obterSolicitacaoPortalDetalheComMensagens:1042`. |
| POST `I/:id/mensagens` | `{ texto }` | `adicionarMensagemPortalArthurSaboya:1056`. |
| POST `I/:id/confirmar-resposta-enviada` | Referência | `portalArthurSaboyaConfirmarRespostaEnviada:1758`. |
| POST `I/:id/marcar-aguardando-data` | Referência | `portalArthurSaboyaMarcarAguardandoData:1812`. |
| POST `I/:id/criar-agendamento` | `{ dataHora, coordenadoriaId, tecnicoId }` | `portalArthurSaboyaCriarAgendamentoDaSolicitacao:1848`. Aqui `tecnicoId` é o técnico da Sala Arthur Saboya, não o especialista da coordenadoria. |
| POST `I/:id/atribuir-tecnico-coordenadoria` | `{ tecnicoId }` | `portalArthurSaboyaAtribuirTecnicoCoordenadoria:1978`. Aqui `tecnicoId` é o especialista que atenderá. |

O controller declara permissões por operação e os métodos de serviço aplicam verificações adicionais. Detalhes internos aceitam UUID/protocolo, enquanto os endpoints do munícipe usam UUID. Preservar essa distinção ao atualizar tipos e rotas.

### Sequência real do encaminhamento

1. A abertura cria `SolicitacaoPreProjetoArthurSaboya` e a primeira mensagem; retorna `{ id, protocolo, emailEnviado }`.
2. A equipe responde pelo chamado e pode confirmar resposta/solução sem criar agendamento.
3. Apesar do nome, `criar-agendamento` registra coordenadoria, data proposta e `tecnicoArthurId`, colocando o chamado em `AGUARDANDO_DATA` no encaminhamento inicial. Se já agendado, também pode atualizar data/unidade do agendamento vinculado.
4. `atribuir-tecnico-coordenadoria` valida técnico ativo e pertencimento à coordenadoria; cria ou atualiza o `Agendamento` e o vínculo em transação; registra mensagem de sistema.
5. Nesse caminho, um novo `Agendamento` nasce `SOLICITADO`, mas o chamado passa a `AGENDAMENTO_CRIADO`. Não assumir que esse status do chamado significa que o evento Teams existe.
6. A interface dispõe do diálogo Teams local. A integração e o chamado têm escritores em processos diferentes.

### Outros escritores no NestJS

Além de Arthur Saboya, o controller ainda expõe `POST agendamentos/criar`, `PATCH agendamentos/atualizar/:id`, `DELETE agendamentos/excluir/:id`, importações de planilha e Outlook. Correspondem a `criar:450`, `atualizar:2657`, `excluir:2898`, `importarPlanilha:2907` e `importarPlanilhaOutlook:3722` no serviço.

Essas rotas podem escrever sem passar pelas Server Actions deste projeto. Sua existência foi confirmada no código; o uso efetivo por outras aplicações não foi verificado. Antes de liberar a proteção de agenda, adequar ou retirar de circulação os caminhos antigos conforme o ambiente real, sem recriar funcionalidades.

## 7. Contratos e compatibilidade a preservar

- **Horários:** `dataHora` é obrigatório; `dataFim` pode faltar. O código local utiliza horário civil de São Paulo nos componentes UTC. Não converter registros antigos silenciosamente; importadores, DTOs, calendário e Graph precisam concordar.
- **Responsáveis:** `tecnicoArthurId` pertence à comunicação da Sala; `Agendamento.tecnicoId` identifica o técnico do atendimento; `tecnicoRF` não é snapshot completo do responsável original do BI.
- **Reserva:** importação reconhece a descrição “TÉCNICO RESERVA” e deixa `tecnicoId = null`; não há status próprio. Reaproveitar atribuição pelo ponto focal.
- **Propriedade munícipe:** processos locais usam `municipeContaId`. O backend Arthur também permite chamados legados sem conta pelo e-mail do munícipe (`escopoWhereMunicipe:709`). Essa compatibilidade deve ser revisada antes de mudar isolamento.
- **Chat:** cliente envia `preprojeto:join` com `{ referencia }`; backend emite `preprojeto:atualizado` com instante da atualização para salas por UUID/protocolo. O evento sinaliza recarga, não transporta o histórico inteiro. Validar autorização da adesão à sala nas alterações de segurança.
- **Schema:** o schema do NestJS inspecionado não contém os campos Teams e portal/CAP presentes no FullStack. Não executar migrations de um projeto supondo que os schemas são equivalentes. Confirmar banco-alvo e responsável pelas migrations antes da etapa de dados.
- **Cache/UI:** manter a revalidação de `agendamentos`, wrappers do serviço e eventos do chat ao centralizar operações.
- **Respostas:** Server Actions usam envelopes como `{ ok, error, data, status }`; endpoints externos têm DTOs próprios, inclusive `{ id, protocolo, emailEnviado }` na abertura. Não uniformizar interfaces desnecessariamente.

## 8. Onde começar as próximas alterações

| Necessidade | Primeiro ponto a editar | Consumidores que precisam acompanhar |
|---|---|---|
| Tabelas/ocorrências/elegibilidade BI | `lib/bi-processos.ts` | `lib/portal-processos-core.ts`, `server-functions/portal-processos.ts`, formulário de processos. |
| Snapshot e modalidade | `prisma/schema.prisma`, `types/agendamento.ts` | Criação/consulta/importação, detalhes, backend Arthur e client Prisma correspondente. |
| Disponibilidade e confirmação | Funções existentes de criação/atualização no núcleo e serviços | Portal, atribuição, importadores, remarcação e métodos NestJS que criam/atualizam agendamento. |
| Reserva/ausências | Atribuição atual, `lib/agendamentos-import.ts`, listagem interna | Própria fila de ponto focal e tratamento de conflitos. |
| Transições/histórico | `server-functions/atualizar.ts`, cancelamentos, presença | Métodos equivalentes NestJS; mensagens já existentes do chamado. |
| Teams | `lib/agendamentos-teams.ts`, `lib/teams-graph.ts` | Botões, atribuição/importação, cancelamento e sincronização de presença. Tratar o script avulso separadamente. |
| Arthur especializado | Métodos NestJS `portalArthurSaboyaCriarAgendamentoDaSolicitacao` e `portalArthurSaboyaAtribuirTecnicoCoordenadoria` | Wrappers HTTP, formulário interno, contrato de data/slot e integração Teams local. |

## 9. Fechamento da etapa 1

- [x] Rotas e consumidores locais identificados.
- [x] Pontos de leitura e escrita locais catalogados.
- [x] Backend Arthur Saboya localizado e principais contratos/métodos rastreados.
- [x] Sequência real de encaminhamento e atribuição registrada.
- [x] Escritores alternativos, script Graph e diferenças de schema identificados.
- [x] Componentes e serviços a reaproveitar relacionados às próximas mudanças.
- [ ] Confirmar em homologação a versão publicada, destinos das APIs, banco compartilhado ou separado e responsabilidade por migrations. Não é verificável apenas pelo código.
- [ ] Homologar a identidade das ocorrências e campos reais do BI antes de alterar o contrato de seleção.

O inventário está concluído no nível do código local disponível. As duas pendências são validações de ambiente/contrato para as etapas seguintes, não justificativa para recriar o backend existente. Nenhuma alteração funcional foi realizada nesta etapa.
