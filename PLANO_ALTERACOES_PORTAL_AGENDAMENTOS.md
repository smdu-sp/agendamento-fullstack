# Plano de atualização do código do Portal de Agendamentos — SMUL

Documento elaborado a partir de `REQUISITOS_PORTAL_AGENDAMENTOS.md` e da inspeção do código local em 21/09/2026. Este plano não implementa as mudanças descritas.

**Etapa 1 executada:** inventário em [MAPEAMENTO_FLUXO_ATUAL_AGENDAMENTOS.md](MAPEAMENTO_FLUXO_ATUAL_AGENDAMENTOS.md). O backend Arthur Saboya foi localizado em `../agendamento_backend`; seus endpoints, métodos e chat serão reaproveitados. Foram identificados escritores nos dois projetos e diferenças entre seus schemas. Permanecem pendentes apenas as confirmações de ambiente e contrato BI indicadas no inventário, sem alteração funcional nesta etapa.

**Etapa 2 preparada em código (28/09/2026):** `lib/bi-processos.ts` passou a consultar as tabelas `prata_*`, devolver ocorrências distintas e aplicar a regra de elegibilidade centralizada em `lib/bi-elegibilidade.ts`. O formulário existente exibe as ocorrências e a confirmação reconsulta a selecionada no backend. A integração com o BI real e uma chave primária de ocorrência ainda precisam ser homologadas. A agenda real continua nas etapas seguintes; estas mudanças não devem ser publicadas isoladamente como fluxo completo de atendimento.

**Etapa 3 preparada em código (28/09/2026):** o schema e a migration `20260928120000_contexto_recurso_modalidade` acrescentam campos opcionais de modalidade, origem, ocorrência, contexto do BI, dúvida e local presencial. O novo atendimento de recurso salva o snapshot a partir da reconsulta do servidor; a interface coleta dúvida/modalidade e exibe o contexto registrado. Atendimentos presenciais não acionam Teams e exigem local antes da confirmação manual. A migration não foi executada no banco. O cadastro interno do local presencial, os parâmetros de agenda e a atualização do backend Arthur Saboya permanecem nas etapas seguintes. Aplicar a migration antes de publicar o código que lê os novos campos.

**Etapa 4 parcialmente preparada em código (28/09/2026):** a migration `20260928140000_agenda_ausencias_tecnicos` adiciona regras recorrentes e ausências. O serviço `lib/agenda-tecnicos.ts` calcula slots pela agenda, subtrai ausências/agendamentos e usa bloqueio `FOR UPDATE` no técnico para reserva, remarcação de atendimentos com modalidade e cadastro de ausência. O formulário de processos consulta esses slots quando o RF do BI identifica um técnico com agenda; sem agenda, mostra o horário como preferência. As ações internas de consulta/cadastro estão prontas, mas a tela interna de manutenção fica para a etapa 7. Não executar rollout como aceite integral CA-AG04: importadores, outros escritores e o backend Arthur Saboya ainda não compartilham o bloqueio; falta teste concorrente com MySQL e aplicar a migration no ambiente alvo.

**Complemento da etapa 4 — técnico reserva e conflitos (28/09/2026):** a migration `20260928160000_encaminhamento_reserva` registra o encaminhamento para reserva e eventos de histórico no agendamento existente. A consulta de horários distingue os slots afetados por ausência; ao escolher um deles, o portal preserva o RF/nome do responsável do BI e envia a demanda sem técnico para a fila manual já usada pela importação. A atribuição interna para agendamentos do portal com modalidade usa a ação local com releitura transacional da agenda e registra a troca. O cadastro de ausência retorna os atendimentos confirmados afetados, grava eventos `CONFLITO_AUSENCIA` e há consulta de conflitos abertos por técnico. A interface de gestão de agenda/conflitos e o ajuste dos escritores externos continuam pendentes; não aplicar as migrations isoladamente sem atualizar o código de todos os processos que usam o mesmo banco.

**Etapa 5 parcialmente preparada em código (28/09/2026):** `lib/agendamento-transicoes.ts` centraliza o grafo de estados da RN-010. A atualização local verifica escopo do técnico, campos permitidos, estado terminal e transição sob bloqueio; criação, alteração de estado, reatribuição, remarcação e cancelamento registram eventos. O diálogo de confirmação interno usa a ação local e oferece apenas `AGENDADO → ATENDIDO/NAO_REALIZADO → CONCLUIDO` conforme o estado. `excluir` deixou de apagar o registro e cancela com ator/motivo; o portal e a CAP verificam o estado e usam atualização condicional. A sincronização Teams não processa `CONCLUIDO` nem `SOLICITADO` e atualiza resultado apenas se ainda estiver `AGENDADO`. As respostas do portal foram reduzidas aos campos utilizados. Ainda faltam alinhar importadores e endpoints do backend Arthur Saboya e homologar os efeitos externos do Graph e a migração em banco real; a etapa não está concluída como aceite global de RN-010 a RN-013.

**Etapa 6 parcialmente preparada em código (28/09/2026):** a migration `20260928180000_sincronizacao_teams` acrescenta pendência, versão, tentativas e lease de processamento. A criação Graph envia `transactionId` igual ao ID estável do agendamento; o serviço reaproveita `teamsEventId` e usa `PATCH` para horário/participantes na remarcação. Cancelamento local persiste primeiro e registra a intenção de cancelar no Graph. O processador protegido `POST /api/internal/teams-sync` recebe `Authorization: Bearer <TEAMS_SYNC_SECRET>` e processa até 20 pendências por chamada, com claim por lease e limite de cinco tentativas; configurar uma tarefa periódica no ambiente de implantação (por exemplo a cada minuto). A ação manual de reunião reinicia as tentativas. Divergência aparece nas telas enquanto pendente. A migration não foi aplicada, não há tarefa periódica configurada nem testes com tenant Graph; homologar timeout após sucesso remoto, cancelamento durante criação e atualização de participantes antes do aceite CA-T01 a CA-T06.

**Etapa 7 parcialmente preparada em código (29/09/2026):** a página interna de agendamentos ganhou o painel Agenda/Ausências/Conflitos, com técnicos filtrados pelo escopo da sessão, cadastro e ativação de regras/ausências, consulta de slots e links para atendimentos em conflito. A atribuição do técnico em atendimento de portal com modalidade agora consulta os slots desse técnico e permite escolher outra data/hora antes de gravar. O formulário público mantém seleção da ocorrência e contexto BI, mas remove os botões fixos quando não há agenda: recebe uma preferência explícita e revalidada no servidor; no resumo sinaliza reserva e ausência de confirmação do horário. Ainda faltam filtros avançados da lista, percursos manuais completos de cadastro/autenticação, teste visual/acessibilidade e a representação sem data obrigatória para solicitações sem reserva. A migration ainda não foi aplicada.

**Etapa 8 parcialmente preparada em código (30/09/2026):** a tela do chamado Arthur consulta os slots online da agenda existente após escolher o técnico da coordenadoria; o encaminhamento aceita data sugerida opcional e não cria agendamento. No projeto irmão `../agendamento_backend`, a confirmação lê o chamado sob bloqueio, bloqueia o técnico, revalida regra de agenda, ausência e ocupação, cria ou atualiza o único agendamento vinculado e grava modalidade/origem, evento e intenção de sincronizar Teams na mesma transação. A resposta direta escrita na tela e o encerramento são gravados juntos no histórico do chamado, sem agendamento; chamadas legadas ao endpoint continuam aceitas sem texto. O protocolo e o chat existentes foram preservados. Ainda faltam testar a concorrência com MySQL real, confirmar que ambos os projetos apontam para o mesmo banco/migrations, alinhar os demais escritores/status da API Arthur e homologar o processamento Teams; portanto CA-A01 a CA-A08 ainda não estão integralmente atendidos. As migrations do FullStack não foram aplicadas.

**Diretriz expressa do usuário:** usar o que já existe; nada deve ser refeito do zero. Todas as entregas abaixo são adequações incrementais do sistema atual. Não substituir a aplicação, reescrever módulos funcionais ou criar fluxos paralelos. Acrescentar somente campos, regras e componentes necessários para cobrir lacunas comprovadas, integrados às estruturas existentes.

## Roteiro prático da atualização

O objetivo é otimizar o fluxo existente e mudar a forma de execução apenas onde os requisitos exigirem. A implementação seguirá as entregas abaixo; as seções seguintes detalham seu diagnóstico e critérios técnicos.

| Ordem | Reaproveitar | Atualizar no código | Resultado verificável |
|---|---|---|---|
| 1. Mapear o percurso atual | Rotas, Server Actions, chamadas externas e importações existentes. | Identificar quem grava cada operação e registrar os contratos atuais; localizar a implementação externa do Arthur Saboya. | Cada mudança tem um ponto de entrada conhecido e não duplica um fluxo já implementado. |
| 2. Ajustar o BI | Pool `mssql`, `lib/bi-processos.ts` e validação em `lib/portal-processos-core.ts`. | Corrigir tabelas e elegibilidade, devolver todas as ocorrências com identidade estável, unidade e RF; revalidar a selecionada. | Pesquisa por processo/protocolo e seleção de ocorrência atendem CA-R01 a CA-R06. |
| 3. Complementar os dados | `Agendamento`, `Usuario`, `Coordenadoria`, `Divisao`, chamados e mensagens no Prisma. | Acrescentar modalidade, origem, contexto original do BI e local; adicionar apenas estruturas de agenda/ausência e controle que ainda não existam. Atualizar os tipos consumidores. | Dados antigos continuam legíveis e o responsável original não é perdido ao atribuir outro técnico. |
| 4. Ajustar disponibilidade | Núcleo de agendamentos, cálculo de duração, seleção de data e atribuição de técnico. | Substituir horários fixos por faixas cadastradas, descontar ausências/ocupações e confirmar com proteção transacional por técnico. Aplicar também à remarcação e às importações. | Duas pessoas não conseguem confirmar intervalos sobrepostos do mesmo técnico. |
| 5. Aproveitar a fila de reserva | Tratamento de `TÉCNICO RESERVA` da importação e atribuição pelo ponto focal. | Encaminhar ausências para o tratamento existente, manter contexto do BI e listar conflitos de agendamentos já confirmados. | O ponto focal atribui ou remarca sem apagar o atendimento nem criar status redundante. |
| 6. Ajustar confirmação e Teams | Server Actions atuais, `lib/agendamentos-teams.ts`, `lib/teams-graph.ts` e campos Teams existentes. | Controlar transições; criar Teams somente online; atualizar evento na remarcação; persistir erros e impedir duplicação nas retentativas. | Presencial não cria reunião; online conserva uma reunião coerente com o atendimento. |
| 7. Atualizar as telas atuais | Formulário de processos, consulta, detalhes, listas, calendário e componentes internos. | Incluir seleção de ocorrência, dúvida, modalidade e horários reais; ampliar a área interna com agenda/ausências; mostrar local ou link Teams. | O usuário percorre as telas conhecidas com as regras atualizadas, sem redesenho geral. |
| 8. Adequar Arthur Saboya | Protocolo, chamado, mensagens, encaminhamento e vínculo com agendamento existentes. | Garantir resposta direta sem agendamento e encaminhamento com técnico/slot do serviço compartilhado; adequar o backend responsável. | Chamado e histórico permanecem; somente o atendimento especializado gera agendamento online. |
| 9. Validar e liberar | Scripts de build/lint, migrations e processo de publicação existentes. | Testar regras críticas, concorrência, permissões, importações e compatibilidade; homologar os dois fluxos e publicar por entregas. | Critérios de aceite demonstrados e registros atuais preservados. |

As entregas 2 a 6 preparam o comportamento utilizado pelas telas. A ativação em produção acontece somente quando os consumidores e todos os caminhos de escrita estiverem adequados. Os testes são feitos junto de cada entrega, e não apenas no final.

### Checklist por entrega

- [ ] Conferir a função/tela existente e seus consumidores antes de editar.
- [ ] Alterar o menor conjunto de arquivos que resolva a necessidade.
- [ ] Reaproveitar validações, componentes, autenticação e consultas compatíveis.
- [ ] Acrescentar persistência somente quando os campos/entidades atuais não representarem a informação necessária.
- [ ] Verificar compatibilidade com registros e importações existentes.
- [ ] Validar o comportamento alterado e sua autorização no backend.
- [ ] Registrar o que mudou, como foi verificado e qualquer dependência pendente.

### Condições para iniciar cada parte

A consulta BI depende de confirmar a identidade de cada ocorrência e os campos reais das tabelas. A agenda pública depende de definir duração, antecedência, horizonte e modalidades por unidade. O encaminhamento por ausência depende de adequar a representação da solicitação ainda sem horário. O código da API Arthur foi localizado; falta confirmar seu uso no ambiente ativo e compatibilidade de banco/migrations com o FullStack. Essas pendências não impedem as demais adequações independentes.

O plano não exige extração de módulos, substituição de backend ou adoção de fila dedicada como pré-condição geral. As propostas técnicas detalhadas abaixo devem ser aplicadas na menor forma que garanta os requisitos. Reprocessamento durável pode aproveitar `agendarReunioesEmLote` com controle persistente e execução definidos; o script avulso `scripts/criar-reunioes-teams-lote.ts` usa lista fixa e Graph direto, não é um executor de pendências do Portal.

## 1. Diagnóstico do código atual

| Área | Evidência encontrada | Alteração necessária |
|---|---|---|
| BI | `lib/bi-processos.ts` consulta `dbo.ComuniqueSes` e `dbo.Despachos`, consolida resultados e escolhe uma referência automaticamente. | Consultar `dbo.prata_comuniquese` e `dbo.prata_despacho`, retornando ocorrências individualizadas com sistema, unidade e responsável/RF. |
| Elegibilidade | Comunique-se fechado/concluído é excluído; despacho usa `startsWith("indefer")`. | Aceitar qualquer situação de comunique-se e apenas despacho normalizado igual a `indeferido`. |
| Revalidação | `lib/portal-processos-core.ts` já consulta novamente o BI antes da criação. | Revalidar a ocorrência escolhida, sem substituir silenciosamente por outra. |
| Conferência CAP | O portal permite prosseguir sem elegibilidade mediante `confirmadoProcessoAusente`. | Impedir que esse caminho autorize despacho inelegível; definir tratamento da CAP para BI indisponível, recurso ausente ou unidade sem correspondência. |
| Agenda | Horários fixos em `lib/portal-processos-constantes.ts`; duração de 60 minutos para processos e 30 minutos para pré-projeto no núcleo atual. | Introduzir regras por técnico, modalidade e vigência. Os valores atuais são comportamento legado, não novos padrões homologados. |
| Disponibilidade | A criação pelo portal verifica duplicidade do próprio munícipe/processo/horário. | Verificar sobreposição por técnico e proteger a confirmação concorrente no banco. |
| RF | `Usuario` não tem campo RF; `rfParaLogin` em `lib/agendamentos-core.ts` usa os seis primeiros caracteres para formar o login. | Validar essa correspondência com o RF do BI e conservar o RF original completo no snapshot. |
| Reserva | `lib/agendamentos-import.ts` reconhece o texto “TÉCNICO RESERVA”, determina coordenadoria e deixa `tecnicoId = null` para atribuição manual. | Reutilizar a fila/atribuição manual. Não existe enum de status `TECNICO_RESERVA` no schema atual. |
| Modelo | Há entidades de agendamento, chamado, mensagens, presença, configuração e cancelamento; não há agenda recorrente, ausência ou modalidade explícita. | Fazer migrações aditivas, reaproveitando as entidades existentes. |
| Teams | `lib/teams-graph.ts` cria/cancela eventos e busca presença; `lib/agendamentos-teams.ts` conserva IDs e erros de criação. | Condicionar à modalidade, atualizar eventos em remarcações e tornar operações recuperáveis e idempotentes. |
| Idempotência Teams | A criação retorna imediatamente se `teamsEventId` já existir; o POST não inclui chave de idempotência. | Cobrir concorrência e timeout após criação remota, antes da gravação local do ID. |
| Cancelamento Teams | Falha remota retorna antes do cancelamento local e é registrada no console. | Persistir falha e pendência de sincronização, evitando perda da intenção de cancelamento. |
| Status | `services/agendamentos/server-functions/atualizar.ts` aceita `data.status` diretamente. | Aplicar transições de domínio a todos os caminhos de escrita. |
| Histórico | Existe exclusão física em `services/agendamentos/server-functions/excluir.ts`. | Impedir exclusão de atendimentos/históricos abrangidos pelo novo fluxo; usar cancelamento e eventos de auditoria. |
| Arthur Saboya | Wrappers em `services/agendamentos/query-functions/` chamam endpoints implementados em `../agendamento_backend/src/agendamentos/`. | Reaproveitar controller/service NestJS e confirmar a versão publicada; atualizar os escritores locais e externos de forma compatível. |
| Tempo real | `server.ts` sobe Socket.IO com conexão/desconexão, sem implementar ali os eventos do chamado. | Preservar o contrato atual do chat e verificar onde os eventos são servidos; persistência do histórico não deve depender do socket. |

O banco do Portal é MySQL via Prisma; a conexão BI já possui adaptador SQL Server com `mssql` e `BI_DATABASE_URL`. Não é necessário criar outra infraestrutura de conexão sem antes validar a existente. O código local do backend NestJS foi inspecionado em modo somente leitura. Não foram acessados bancos, Graph, credenciais do `.env` ou APIs em execução.

## 2. Direção da implementação

Manter o padrão atual de `lib/` para regras de servidor, `services/` para entrada/consulta e `app/`/`components/` para interface. Centralizar regras compartilhadas para que portal, área interna, importações e Arthur Saboya não confirmem horários por caminhos independentes.

Priorizar alterações nos arquivos existentes. Extrações de funções para arquivos auxiliares são opcionais e devem reaproveitar a implementação atual, sem constituir outra arquitetura. Preservar autenticação, cadastros, importações, chat, integrações, componentes visuais, rotas e contratos compatíveis. Mudanças de comportamento ficam restritas ao necessário para atender aos requisitos.

Fluxo de recurso: pesquisar → selecionar ocorrência → identificar unidade e RF → informar dúvida/modalidade → consultar disponibilidade → revalidar BI e disponibilidade → confirmar → sincronizar Teams quando online.

Fluxo Arthur Saboya: abrir chamado → responder e encerrar sem agendamento, ou encaminhar → definir técnico → escolher disponibilidade → criar e vincular agendamento online → sincronizar Teams.

Separar situação do atendimento de situação da integração. Um erro de Graph deve aparecer como pendência operacional e poder ser reprocessado sem reservar outro horário nem criar outro atendimento.

## 3. Etapas de execução

### Etapa 1 — Fechar contratos e compatibilidade

**Arquivos:** `lib/api-url.ts`, `services/agendamentos/query-functions/portal-arthur-saboya-solicitacoes-mutacoes.ts`, `services/agendamentos/query-functions/municipe-pre-projetos-chamados.ts`, `lib/bi-processos.ts`, `prisma/schema.prisma`.

- Inventariar todos os pontos que criam, atribuem, remarcam, cancelam ou excluem agendamentos, incluindo importações e a API externa.
- Backend localizado em `../agendamento_backend`: adequar sua implementação existente nas etapas correspondentes. Não propor migração de backend nem recriar endpoints; confirmar a versão em uso e os bancos-alvo antes de publicar mudanças entre os projetos.
- Confirmar no BI nomes/tipos dos campos e uma chave estável de ocorrência. Processo/protocolo, isoladamente, não identificam um comunique-se ou despacho entre vários.
- Se o BI não oferecer chave única, pactuar uma chave composta estável e como tratar colisões. Não usar índice da lista como identidade.
- Validar RF → login e mapeamento unidade → coordenadoria/divisão, sem escolher arbitrariamente quando houver ambiguidade.
- Definir a fronteira entre solicitação ainda sem técnico/horário e reserva confirmada. Hoje `Agendamento.dataHora` é obrigatório: a fila de reserva sem data exige adequação explícita, não uma data fictícia.
- Auditar a convenção existente de horário civil de São Paulo armazenado nos componentes UTC; definir um único contrato e preservar a leitura dos registros legados.

**Entrega:** contrato de ocorrência BI, matriz dos caminhos de escrita e decisões registradas para migração e fila sem horário.

### Etapa 2 — Evoluir o modelo sem perda de dados

**Arquivos:** `prisma/schema.prisma`, novas migrations em `prisma/migrations/`, `types/agendamento.ts`, `types/solicitacao-pre-projeto-arthur-saboya.ts`.

- Adicionar modalidade (`PRESENCIAL`, `ONLINE`), origem (`RECURSO`, `ARTHUR_SABOYA`) e tipo do recurso (`DESPACHO`, `COMUNIQUE_SE`).
- Preservar inicialmente como opcionais os campos novos em registros antigos; não classificar automaticamente importações antigas sem evidência de origem/modalidade.
- Armazenar o snapshot por extensão do `Agendamento` existente, reaproveitando `processo` e os campos de contexto compatíveis, acrescentando apenas chave da ocorrência, protocolo, sistema, situação, unidade, nome/RF originais e instante da consulta que faltarem. Uma nova consulta não deve sobrescrever o snapshot da confirmação.
- Manter `tecnicoId` para quem executará o atendimento, separado dos dados originais do BI.
- Criar `AgendaTecnico` e `AusenciaTecnico` com os campos das seções 42 e 43 dos requisitos, índices por técnico/período e validação de intervalos.
- Acrescentar local, sala e orientação de acesso para presencial.
- Acrescentar histórico de eventos do agendamento com ator, instante, ação e valores relevantes anteriores/novos. Reutilizar as mensagens de sistema para eventos do chamado Arthur Saboya.
- Conservar os campos Teams atuais e acrescentar controle persistente de operação, versão/chave de idempotência, tentativas e próxima execução, preferencialmente por uma tabela de operações pendentes (outbox).
- Registrar o autor munícipe de cancelamentos/eventos, além de `canceladoPorId`, que hoje referencia somente usuário interno.
- Para solicitações de recurso sem reserva, evoluir o registro e a fila existentes para representar a ausência de data/técnico, revisando os consumidores afetados. Não criar outro fluxo de solicitação nem usar uma data fictícia.

**Migração:** expandir schema → publicar código compatível → preencher apenas dados comprováveis → auditar registros pendentes → aplicar obrigatoriedade para novos fluxos. Não fabricar snapshots históricos consultando o BI atual como se fossem dados do passado.

### Etapa 3 — Corrigir consulta, elegibilidade e roteamento BI

**Arquivos existentes:** `lib/bi-processos.ts`, `lib/portal-processos-core.ts`, `services/agendamentos/server-functions/portal-processos.ts`, `lib/agendamentos-core.ts`, `lib/usuarios-core.ts`.

**Reaproveitamento:** ajustar as funções de elegibilidade em `lib/bi-processos.ts` e o roteamento em `lib/portal-processos-core.ts`; extrair auxiliares somente se necessário, sem duplicar regras.

- Reutilizar pool e consultas parametrizadas, com acesso exclusivamente de leitura ao BI.
- Buscar nas duas tabelas por processo ou protocolo, retornando a lista de ocorrências sem duplicar a mesma ocorrência encontrada por ambos os campos.
- Centralizar a elegibilidade: todo comunique-se é elegível nesta versão; despacho exige igualdade normalizada com `INDEFERIDO`.
- Retornar os dados necessários para distinguir as ocorrências e a justificativa de inelegibilidade quando exibida.
- Distinguir BI indisponível, consulta sem resultados, ocorrência inelegível e unidade/RF não mapeados.
- Na confirmação, consultar a ocorrência selecionada novamente e validar elegibilidade, unidade, responsável e compatibilidade do técnico/slot. Se o contexto mudar, solicitar nova seleção em vez de usar outra ocorrência.
- Persistir dúvida e snapshot a partir de dados do servidor. Ignorar alegações de elegibilidade, unidade ou RF enviadas pelo cliente.
- Revisar o caminho `confirmadoProcessoAusente` e a conferência CAP para que não contornem a elegibilidade. O tratamento de exceções deve ser definido antes de habilitar o novo fluxo.

**Aceite:** CA-R01 a CA-R06 e RN-003, inclusive adulteração de payload e alteração do BI entre pesquisa e confirmação.

### Etapa 4 — Agenda, ausências e reserva concorrente

**Base existente:** `lib/agendamentos-core.ts`, `lib/portal-processos-core.ts` e `services/agendamentos/`. Complementar essa base com regras de agenda/ausências, hoje ausentes, e uma função compartilhada de reserva. Arquivos auxiliares podem organizar essas adições, mas não substituir o núcleo existente nem criar um segundo motor de agendamentos.

- Implementar manutenção de faixas recorrentes, duração, modalidade, vigência e ativação, validando faixas sobrepostas/inválidas.
- Gerar slots sob demanda para um período limitado: agenda menos ausências e reservas existentes. Deduplicar faixas e não oferecer horário passado.
- Detectar sobreposição de intervalos, não apenas igualdade do início; usar limites coerentes, permitindo um atendimento começar exatamente quando o anterior termina.
- Confirmar em transação MySQL, com bloqueio por técnico em registro estável, releitura das regras/ausências/reservas e gravação atômica. Um `findFirst` antes do `create` não protege contra concorrência.
- Compartilhar o mesmo protocolo de bloqueio entre confirmação, atribuição, remarcação, criação de ausência e alteração de agenda. Na troca de técnico, bloquear ambos em ordem determinística.
- Definir quais estados consomem disponibilidade. Proposta: solicitações ainda sem confirmação não reservam slot; reservas confirmadas e pendentes apenas de integração consomem o intervalo. Validar esse contrato antes da migração.
- Ao cadastrar ausência, persistir o bloqueio e identificar atendimentos afetados, sem apagá-los. Oferecer tratamento por reatribuição, reserva ou remarcação e registrar histórico.
- Reutilizar a atribuição manual pelo ponto focal para técnico reserva. A ausência deve ser avaliada no período pretendido do atendimento, não somente na data atual.
- Nenhuma importação ou endpoint externo poderá confirmar reservas fora dessa proteção após o corte. Conflitos de importação devem ser apresentados para tratamento.

**Aceite:** CA-AG01 a CA-AG06, com teste real de duas transações simultâneas, sobreposição parcial, ausência concorrente e remarcação preservando a reserva anterior se a nova falhar.

### Etapa 5 — Status, autorização e histórico comuns

**Arquivos:** `services/agendamentos/server-functions/{criar,atualizar,excluir,conferencia-cap,portal-processos}.ts`, `lib/authz.ts`, `lib/agendamentos-teams.ts`, serviços de importação e endpoints externos identificados na etapa 1.

**Reaproveitamento:** centralizar transições no núcleo atual de agendamentos e aproveitar os mecanismos existentes de mensagens/histórico; complementar apenas a auditoria que faltar.

- Implementar as transições da RN-010 e impedir atualização livre de status, inclusive por sincronização de presença.
- Centralizar confirmação, atribuição, remarcação, cancelamento e conclusão em operações com validação e histórico transacional.
- Validar permissão e escopo da entidade no servidor: técnico, coordenadoria, divisão e proprietário munícipe. A permissão geral de acesso à função não basta.
- Revisar a permissão `TEC` na atualização para impedir alteração de registros fora do escopo autorizado.
- Trocar exclusão física dos registros protegidos por cancelamento com motivo e ator; preservar os históricos existentes.
- Considerar estados terminais em todos os endpoints, inclusive `CONCLUIDO`.
- Retornar ao portal apenas campos necessários ao munícipe, sem detalhes de erro interno, credenciais ou dados de outros participantes sem autorização.

**Aceite:** RN-010 a RN-013 e RF-026/RF-031; acessos cruzados e transições inválidas rejeitados também por requisições diretas.

### Etapa 6 — Completar Teams e presença

**Arquivos:** `lib/teams-graph.ts`, `lib/agendamentos-teams.ts`, `services/agendamentos/server-functions/{agendar-reuniao-teams,cancelar-reuniao-teams,sincronizar-presenca}.ts`, `scripts/criar-reunioes-teams-lote.ts`.

- Conferir modalidade no serviço compartilhado: presencial nunca cria Teams, mesmo por importação, reprocessamento ou botão manual.
- Criar operação de integração junto da confirmação local e executá-la após o commit; não manter transação de reserva aberta durante chamadas de rede.
- Implementar chave estável de idempotência para criação e reconciliação após timeout. Confirmar o mecanismo suportado pela API Graph na implementação; apenas testar `teamsEventId` local não basta.
- Implementar atualização do evento existente para remarcação e participantes, preservando os IDs apropriados.
- Persistir cancelamento local e intenção de cancelamento remoto; registrar erros em `teamsUltimoErro` e permitir reprocessamento. Mostrar divergência enquanto não sincronizada.
- Serializar operações por agendamento/versão para uma tentativa antiga não recriar uma reunião cancelada ou restaurar horário anterior.
- Escolher e documentar o executor de operações pendentes para o ambiente de implantação, com retentativas limitadas e recuperação após reinício.
- Reutilizar `PresencaReuniao`, evitando duplicação em sincronizações repetidas e respeitando as transições do atendimento. Validar se as regras atuais de presença representam munícipe/técnico corretamente antes de automatizar conclusão.

**Aceite:** CA-T01 a CA-T06 e RN-009; incluir falha após sucesso remoto, chamadas concorrentes, cancelamento durante criação e reprocessamento após reinício.

### Etapa 7 — Adaptar as telas do portal e da área interna

**Portal:** `app/_portal/processos/_components/form-agendamento-processo.tsx`, `app/_portal/consulta/_components/lista-agendamentos-portal-processo.tsx`, páginas de consulta e `types/agendamento.ts`.

- Substituir seleção genérica de tipo por pesquisa e seleção explícita da ocorrência do BI.
- Acrescentar descrição da dúvida, modalidade, slots recebidos do backend e resumo do recurso selecionado.
- Remover a oferta baseada em `HORARIOS_PORTAL_PROCESSO` no novo fluxo.
- Mostrar tratamento de técnico reserva sem prometer horário ainda não confirmado.
- Mostrar endereço/sala para presencial e link/situação de integração para online; refletir alterações e cancelamentos.
- Reaproveitar cadastro, autenticação e recuperação de senha existentes, verificando os percursos completos.

**Área interna:** ampliar as telas existentes com abas Agenda/Ausências/Conflitos e reaproveitar os componentes de calendário, formulários e tabelas. Arquivos-base: `app/(rotas-auth)/agendamentos/page.tsx`, `app/(rotas-auth)/_components/atribuir-tecnico.tsx`, `agendamento-detalhe-view.tsx`, `lista-agendamentos.tsx` e `reuniao-teams-dialog.tsx`. Ajustar a navegação existente apenas se necessário, sem redesenhar o portal.

- Permitir cadastro de regras/ausências, consulta da ocupação e tratamento dos conflitos conforme escopo autorizado.
- Distinguir responsável original do BI e técnico do atendimento.
- Usar as mesmas disponibilidades para atribuição e remarcação.
- Atualizar filtros de unidade, divisão, técnico, origem, modalidade e status conforme necessidade do fluxo.
- Preservar o `basePath` `/agendamento` e os wrappers das páginas públicas existentes.

**Aceite:** RF-032/RF-033, cenários de erro/ausência de slots, navegação e acesso restrito.

### Etapa 8 — Integrar o fluxo Arthur Saboya

**Arquivos locais:** `app/(rotas-auth)/pedidos-pre-projetos-arthur-saboya/_components/`, `app/_portal/pre-projetos/page.tsx`, `services/agendamentos/query-functions/portal-arthur-saboya-solicitacoes-mutacoes.ts`, `services/agendamentos/query-functions/municipe-pre-projetos-chamados.ts`, `lib/pre-projeto-chamado-mensagens.ts`, `lib/pedidos-pre-projetos-arthur-saboya-acesso.ts`, `components/arthur-saboya/pre-projeto-chamado-chat.tsx`.

- Reutilizar protocolo, entidades, mensagens e os quatro status existentes do chamado.
- Tornar resposta direta e encerramento atômicos, sem criar `Agendamento`.
- No encaminhamento, preservar o chamado e registrar coordenadoria/divisão e eventos de sistema.
- Selecionar técnico e slot pelo serviço comum; criar agendamento `ONLINE` de origem `ARTHUR_SABOYA`, vincular o chamado e registrar histórico em uma transação.
- Garantir que repetição de confirmação gere um único agendamento por chamado, aproveitando `agendamentoId @unique` e proteção transacional do próprio chamado.
- Disparar a integração Teams após confirmação sem exigir um segundo fluxo manual contraditório com o requisito.
- Preservar histórico de mensagens e autorização de cada leitura/escrita; manter eventos de tempo real compatíveis com o backend responsável.
- Adequar as regras já implementadas na API externa, preservando seus contratos compatíveis. Alterar somente os wrappers deste repositório não implementa essas regras; não recriar o backend para contornar a falta de acesso ao código.

**Aceite:** CA-A01 a CA-A08 e regressão de protocolo, chat, consulta e avaliação já existentes.

### Etapa 9 — Validar e publicar por etapas

- Criar testes de domínio para elegibilidade, transições, geração de slots, vigência, ausências e limites dos intervalos.
- Criar testes de integração no MySQL para dupla reserva, mudança concorrente de disponibilidade, vínculo único do chamado e atomicidade do histórico.
- Usar fixtures do BI para múltiplas ocorrências e mudanças entre consulta/confirmação; homologar o contrato com acesso somente de leitura.
- Usar um adaptador simulado do Graph para falhas/repetições e realizar a homologação de eventos reais apenas no ambiente apropriado.
- Cobrir autorização de acesso aos chamados, mensagens, agendas e agendamentos; testar munícipes distintos e usuários de unidades diferentes.
- Validar migração em cópia de banco com dados legados, incluindo importações, `dataFim` ausente, modalidade desconhecida e horários na convenção antiga.
- Executar lint, verificação TypeScript, geração/validação Prisma e build; registrar falhas preexistentes separadamente. O `package.json` atual não define comando de testes, portanto configurar uma suíte é parte da implementação.
- Publicar primeiro o schema compatível e os serviços comuns; depois habilitar os novos fluxos com possibilidade de desativação, preservando registros já criados.
- Documentar configuração em `example.env`/`README.md`, operação da fila de integração, reprocessamento e rollback de aplicação sem rollback destrutivo dos dados.

## 4. Decisões pendentes e evidências aproveitáveis

| Decisão | Evidência atual / encaminhamento |
|---|---|
| Conexão BI | Adaptador já existe. Validar acesso às tabelas `prata_*`, permissões de leitura e esquema real. |
| Identidade da ocorrência | Não está definida no documento; necessária para seleção e revalidação confiáveis. |
| Mapeamento unidade/RF | Há normalização de siglas e conversão RF → login. Homologar ambiguidades, zeros à esquerda, dígito verificador e usuário inativo/não encontrado. |
| CAP | Há fallback operacional que diverge da elegibilidade exigida. Definir tratamento de exceções sem permitir agendamento de despacho inelegível. |
| Solicitação sem horário | Modelo atual exige `dataHora`; decidir representação antes de implementar a fila de reserva. |
| Responsabilidade da API Arthur | Implementação localizada em `../agendamento_backend`. Confirmar versão publicada, destino das chamadas e responsabilidade pelas migrations, pois os schemas locais diferem. |
| Duração | Código usa 60 minutos para processo e 30 para pré-projeto. Manter como referência legada, parametrizar agenda e homologar padrões. |
| Cancelamento | Portal já exige 24h para cancelamento de confirmado. Registrar como regra existente e validar sua manutenção. |
| Antecedência/horizonte/remarcação | Não inventar números. Definir parâmetros e condições antes de disponibilizar agenda pública. |
| Técnico reserva | Atribuição manual por ponto focal já existe. Não introduzir distribuição automática sem regra aprovada. |
| Modalidades e locais | Homologar disponibilidade e endereços por unidade antes da abertura de slots presenciais. |
| Outros pontos do requisito | Continuam pendentes: futuros status de comunique-se, SLAs, tipos oficiais de ausência, templates de e-mail, anexos e regras de avaliação. Não ampliar o escopo com regras presumidas. |

Essas decisões não impedem a preparação dos serviços, testes e migrações compatíveis, mas condicionam a liberação das partes dependentes.

## 5. Ordem sugerida de entregas revisáveis

1. Contratos, inventário dos caminhos de escrita e estratégia de compatibilidade.
2. Schema aditivo, tipos e regras centrais de elegibilidade/status/autorização.
3. Consulta de ocorrências BI, revalidação e snapshot.
4. Agenda, ausências, reserva transacional e integração de todos os escritores.
5. Teams por modalidade, operações idempotentes e sincronização recuperável.
6. Adequação do percurso existente do munícipe e ampliação das telas internas com agenda/conflitos.
7. Arthur Saboya integrado ao motor comum, incluindo backend responsável.
8. Homologação dos critérios de aceite, migração de dados comprováveis e liberação gradual.

Testes acompanham cada entrega. As etapas de domínio e integração podem ser entregues antes da ativação da interface pública, mas a liberação depende de todos os caminhos de confirmação respeitarem as mesmas regras.
