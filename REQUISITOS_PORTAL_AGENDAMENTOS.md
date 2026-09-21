# Requisitos do Portal de Agendamentos de Atendimentos Técnicos — SMUL

> **Documento de referência para desenvolvimento e agentes de IA**
>
> Este arquivo consolida as regras de negócio e requisitos do Portal de Agendamentos da SMUL com base na visão funcional definida para o produto e na estrutura atualmente existente no projeto `agendamento-fullstack`.
>
> Os agentes que trabalharem neste repositório devem considerar este documento como contexto funcional antes de propor ou implementar alterações relacionadas a agendamentos, processos, Sala Arthur Saboya, Microsoft Teams, agenda de técnicos, ausências e integrações com o BI.

---

## 1. Objetivo do sistema

O sistema será o **Portal de Agendamentos de Atendimentos Técnicos da Secretaria Municipal de Urbanismo e Licenciamento — SMUL**.

O portal deverá permitir ao munícipe solicitar atendimento técnico em dois contextos principais:

1. **Atendimento relacionado a processo existente**
   - Comunique-se;
   - Despacho indeferido.

2. **Atendimento de pré-projeto — Sala Arthur Saboya**
   - esclarecimento de dúvidas antes da abertura formal de um processo;
   - solução direta da dúvida pelos técnicos da Sala Arthur Saboya;
   - ou encaminhamento para atendimento especializado por uma coordenadoria.

O sistema deverá centralizar:

- consulta e validação dos processos;
- solicitação de atendimento;
- triagem;
- identificação da unidade responsável;
- identificação do técnico responsável;
- agenda dos técnicos;
- ausências;
- técnico reserva;
- escolha de horários;
- atendimento presencial;
- atendimento online;
- reuniões Microsoft Teams;
- acompanhamento de solicitações;
- histórico;
- cancelamentos;
- presença em reuniões;
- conclusão dos atendimentos.

---

# 2. Princípios de arquitetura

O sistema possui três responsabilidades de dados distintas.

## 2.1 Banco BI

O **BI da SMUL será a fonte de verdade para os dados de processos, despachos e comunique-ses** utilizados para determinar a possibilidade de atendimento.

O Portal deverá acessar o BI apenas para consulta.

O Portal **não deverá alterar os dados das tabelas do BI**.

## 2.2 Banco transacional do Portal

O banco utilizado pelo Prisma continuará sendo responsável pelos dados operacionais do Portal, incluindo:

- usuários;
- contas de munícipes;
- solicitações;
- agendamentos;
- coordenadorias;
- divisões;
- técnicos;
- agenda;
- ausências;
- mensagens;
- cancelamentos;
- configurações;
- informações de reuniões;
- presença.

## 2.3 Microsoft Graph / Teams

O Microsoft Graph será utilizado para criação e gerenciamento das reuniões online realizadas através do Microsoft Teams.

Fluxo conceitual:

```text
Munícipe
   |
   v
Portal de Agendamentos
   |
   +----------> BI SMUL
   |            somente leitura
   |
   +----------> Banco do Portal
   |
   +----------> Microsoft Graph / Teams
```

---

# 3. Estruturas já existentes no sistema

O projeto já possui estruturas que devem ser reutilizadas sempre que possível.

Entre as principais:

- `Usuario`;
- `MunicipeConta`;
- `Agendamento`;
- `TipoAgendamento`;
- `Motivo`;
- `Coordenadoria`;
- `Divisao`;
- `SolicitacaoPreProjetoArthurSaboya`;
- `SolicitacaoPreProjetoArthurSaboyaMensagem`;
- `ConfiguracaoSistema`;
- `PresencaReuniao`;
- logs de importação.

Também já existem permissões como:

- `DEV`;
- `ADM`;
- `TEC`;
- `ARTHUR_SABOYA`;
- `ADM_ARTHUR_SABOYA`;
- `USR`;
- `PONTO_FOCAL`;
- `COORDENADOR`;
- `PORTARIA`;
- `DIRETOR`.

Antes de criar novas entidades, status ou fluxos, deve-se verificar se já existe implementação equivalente no projeto.

---

# 4. Fluxos principais

O sistema terá dois fluxos principais:

```text
PORTAL
 |
 +-- Atendimento de recurso
 |    |
 |    +-- Comunique-se
 |    |
 |    +-- Despacho indeferido
 |
 +-- Sala Arthur Saboya
      |
      +-- Dúvida resolvida diretamente
      |
      +-- Encaminhamento para coordenadoria
           |
           +-- Agendamento
           |
           +-- Reunião Teams
```

---

# 5. Atendimento relacionado a processo

## RF-001 — Entrada por processo ou protocolo

O munícipe deverá poder pesquisar utilizando:

- número do processo; ou
- número do protocolo.

O backend deverá utilizar o valor informado para consultar o BI.

A pesquisa não deverá depender exclusivamente de dados enviados pelo frontend.

---

# 6. Consulta de comunique-se no BI

## RF-002 — Fonte de dados de comunique-se

O sistema deverá consultar:

```sql
dbo.prata_comuniquese
```

Os campos relevantes são:

| Campo | Utilização |
|---|---|
| `processo` | Número do processo |
| `sistema` | Sistema no qual o processo tramita |
| `protocolo` | Protocolo utilizado pelo sistema de origem |
| `situacaoComuniquese` | Situação do comunique-se |
| `unidadeComuniquese` | Unidade responsável |
| `responsavelComuniquese` | Nome do técnico responsável |
| `responsavelComuniqueseID` | RF do técnico responsável |

A pesquisa deverá permitir localizar registros por:

```text
processo
OU
protocolo
```

---

## RN-001 — Elegibilidade de comunique-se

Neste momento, **qualquer valor de `situacaoComuniquese` deverá ser considerado elegível**.

Essa regra é provisória.

A implementação deverá permitir que futuramente sejam definidos quais status de comunique-se podem ou não abrir atendimento.

Não espalhar essa regra em diversos pontos do código. A elegibilidade deverá ficar centralizada em serviço/regra de domínio.

---

# 7. Consulta de despacho no BI

## RF-003 — Fonte de dados de despacho

O sistema deverá consultar:

```sql
dbo.prata_despacho
```

Os campos relevantes são:

| Campo | Utilização |
|---|---|
| `sistema` | Sistema no qual o processo tramita |
| `processo` | Número do processo |
| `protocolo` | Protocolo utilizado pelo sistema |
| `situacaoDespacho` | Situação do despacho |
| `unidadeDespacho` | Unidade responsável |
| `responsavelDespacho` | Nome do técnico responsável |
| `responsavelDespachoID` | RF do técnico responsável |

---

## RN-002 — Elegibilidade de despacho

Somente poderá gerar atendimento o despacho cuja situação seja:

```text
INDEFERIDO
```

A comparação deverá ser normalizada para evitar problemas decorrentes de:

- caixa alta/baixa;
- espaços adicionais;
- diferenças de apresentação do dado.

Exemplo conceitual:

```text
trim(lower(situacaoDespacho)) == "indeferido"
```

A validação deverá ocorrer no backend.

---

# 8. Resultado da consulta

## RF-004 — Múltiplas ocorrências

Um mesmo processo poderá possuir:

- vários comunique-ses;
- vários despachos;
- ou ambos.

O sistema não deverá assumir que o primeiro registro encontrado é aquele que originará o atendimento.

O munícipe deverá poder identificar e selecionar a ocorrência relacionada à sua dúvida.

---

## RF-005 — Exibição dos recursos

O Portal deverá apresentar informações suficientes para diferenciar as ocorrências encontradas.

Entre elas:

- tipo do recurso;
- processo;
- protocolo;
- sistema;
- situação;
- unidade.

Despachos não elegíveis não poderão gerar agendamento.

---

# 9. Revalidação

## RN-003 — Revalidação antes da confirmação

A consulta apresentada ao munícipe não deverá ser considerada autorização definitiva para o agendamento.

Antes da criação da solicitação/agendamento, o backend deverá consultar ou validar novamente o registro selecionado.

Isso evita que uma mudança no BI entre a pesquisa e a confirmação produza um atendimento inválido.

---

# 10. Unidade responsável

## RF-006 — Roteamento pela unidade do BI

A unidade responsável deverá ser obtida através de:

### Comunique-se

```text
unidadeComuniquese
```

### Despacho

```text
unidadeDespacho
```

Essa informação será utilizada para direcionar o atendimento à unidade responsável.

Quando possível, o valor deverá ser relacionado às entidades já existentes:

- `Coordenadoria`;
- `Divisao`.

---

# 11. Técnico responsável

## RF-007 — Identificação do técnico

O técnico originalmente responsável pelo assunto deverá ser obtido através dos campos:

### Comunique-se

```text
responsavelComuniquese
responsavelComuniqueseID
```

### Despacho

```text
responsavelDespacho
responsavelDespachoID
```

O campo `responsavel*ID` contém o **RF — Registro Funcional**.

O RF deverá ser a principal referência para relacionar o responsável retornado pelo BI a um `Usuario` interno.

---

# 12. Responsável original x técnico do atendimento

## RN-004 — Separação dos conceitos

O sistema deverá distinguir:

1. **responsável original pelo processo/recurso**;
2. **técnico que efetivamente realizará o atendimento**.

Essas pessoas poderão ser diferentes.

Isso acontece, por exemplo, quando:

- o responsável está de férias;
- o responsável está afastado;
- existe técnico reserva;
- ocorre redistribuição interna.

O responsável original retornado pelo BI nunca deverá ser perdido.

---

# 13. Snapshot do BI

## RF-008 — Preservação dos dados utilizados

Ao confirmar uma solicitação de atendimento, o sistema deverá preservar um snapshot das informações utilizadas na decisão.

Deverão ser armazenados, quando aplicável:

- tipo do recurso;
- processo;
- protocolo;
- sistema;
- situação;
- unidade;
- responsável original;
- RF do responsável original.

O objetivo é preservar o contexto que existia quando o atendimento foi solicitado, mesmo que posteriormente os dados do BI sejam alterados.

---

# 14. Agenda dos técnicos

## RF-009 — Tela de agenda

A área interna deverá possuir uma tela de gerenciamento de agenda dos técnicos.

Deverá ser possível definir:

- técnico;
- dias da semana;
- horário inicial;
- horário final;
- duração dos atendimentos;
- modalidade;
- período de vigência;
- status ativo/inativo.

Exemplo:

```text
Técnico: João Silva

Terça-feira
09:00 às 12:00

Quinta-feira
14:00 às 17:00

Duração do atendimento: 30 minutos
```

---

## RF-010 — Agenda recorrente

A agenda deverá funcionar preferencialmente como regra recorrente.

Não é necessário criar antecipadamente um registro para cada horário futuro.

A partir das regras cadastradas, o sistema deverá calcular os slots disponíveis.

---

# 15. Cálculo da disponibilidade

## RN-005 — Fórmula de disponibilidade

A disponibilidade deverá ser calculada conceitualmente como:

```text
Agenda regular
- Ausências
- Agendamentos existentes
= Horários disponíveis
```

Um horário somente poderá ser oferecido se atender simultaneamente às três condições.

---

## RF-011 — Geração dos slots

A partir da duração configurada, o sistema deverá gerar os horários possíveis.

Exemplo:

```text
Agenda: 09:00 às 12:00
Duração: 30 minutos

09:00
09:30
10:00
10:30
11:00
11:30
```

Slots bloqueados por ausência ou outro agendamento deverão ser removidos.

---

# 16. Ausências

## RF-012 — Aba de ausências

A tela de agenda deverá possuir uma aba destinada ao cadastro de ausências.

Deverá ser possível cadastrar:

- técnico;
- tipo de ausência;
- data inicial;
- data final;
- horário inicial/final, quando aplicável;
- observação;
- situação.

Exemplos:

- férias;
- licença;
- afastamento;
- compromisso institucional;
- bloqueio de agenda;
- outros.

---

## RF-013 — Ausência parcial ou integral

O sistema deverá suportar:

- ausência de algumas horas;
- ausência de um dia;
- ausência de vários dias.

Durante o período correspondente, os slots do técnico não poderão ser oferecidos.

---

# 17. Técnico reserva

## RN-006 — Encaminhamento para técnico reserva

Quando o BI indicar um técnico responsável e esse técnico estiver em férias ou outra ausência impeditiva, a solicitação deverá entrar no fluxo de:

```text
TÉCNICO RESERVA
```

O projeto já possui conceito/status de técnico reserva no fluxo atual de importação de planilha.

**Antes de criar um novo status ou estrutura, a implementação existente deverá ser localizada e reutilizada sempre que possível.**

---

## RN-007 — Preservação do técnico original

Mesmo quando a demanda for direcionada para técnico reserva, deverão ser preservados:

- nome do responsável original;
- RF original;
- unidade original;
- recurso que originou o atendimento.

O técnico reserva será o responsável pelo atendimento, não necessariamente o responsável pelo processo.

---

# 18. Ausência criada após agendamento

## RF-014 — Detecção de conflitos

Caso seja cadastrada uma ausência para um período que já possua atendimentos confirmados, os agendamentos não deverão ser apagados automaticamente.

O sistema deverá identificar os conflitos.

O atendimento deverá poder ser:

- atribuído a outro técnico;
- atribuído a técnico reserva;
- remarcado.

O histórico deverá ser preservado.

---

# 19. Concorrência de agenda

## RN-008 — Proteção contra dupla reserva

Não será suficiente esconder horários ocupados na interface.

No momento da confirmação, o backend deverá verificar novamente a disponibilidade.

O objetivo é impedir que dois munícipes reservem simultaneamente o mesmo técnico e horário.

---

# 20. Atendimento de recurso

## RF-015 — Criação

Após selecionar um recurso elegível, o munícipe deverá informar a dúvida ou motivo do atendimento.

O atendimento deverá ficar associado ao contexto obtido no BI.

---

# 21. Modalidade

## RF-016 — Modalidades permitidas

Atendimentos relacionados a recursos poderão ser:

```text
PRESENCIAL
ONLINE
```

A modalidade deverá ser armazenada explicitamente no agendamento.

---

# 22. Atendimento presencial

## RF-017 — Dados do atendimento presencial

O atendimento presencial deverá possuir:

- data;
- horário inicial;
- horário final;
- técnico;
- unidade;
- local;
- sala ou orientação de acesso, quando necessário.

Atendimento presencial **não deverá criar reunião Microsoft Teams**.

---

# 23. Atendimento online

## RF-018 — Reunião online

Quando o atendimento for online, após a confirmação do horário o sistema deverá criar uma reunião no Microsoft Teams.

O link deverá ficar disponível ao:

- munícipe;
- técnico;
- demais participantes autorizados.

---

# 24. Sala Arthur Saboya

## RF-019 — Objetivo

A Sala Arthur Saboya é destinada ao atendimento de **pré-projetos**, permitindo que o munícipe tire dúvidas técnicas antes de entrar formalmente com um processo.

Esse fluxo não exige a existência de processo administrativo.

---

## RF-020 — Abertura do chamado

A estrutura existente:

```text
SolicitacaoPreProjetoArthurSaboya
```

deverá continuar sendo utilizada.

A solicitação deverá possuir protocolo próprio.

Entre os dados já previstos estão:

- nome;
- e-mail;
- formação;
- natureza;
- descrição da dúvida.

O status inicial deverá continuar sendo:

```text
SOLICITADO
```

---

# 25. Triagem Arthur Saboya

## RF-021 — Análise inicial

Um técnico da Sala Arthur Saboya deverá analisar a solicitação.

Existem dois caminhos principais:

```text
Solicitação
   |
   +-- Sala consegue responder
   |
   +-- Necessário técnico da coordenadoria
```

---

# 26. Solução direta pela Sala Arthur Saboya

## RF-022 — Resposta sem reunião

Quando a própria Sala Arthur Saboya conseguir solucionar a dúvida:

1. o técnico registra a resposta;
2. o munícipe recebe/visualiza a resposta;
3. o chamado é encerrado;
4. nenhum `Agendamento` é criado.

O status existente:

```text
RESPONDIDO
```

poderá continuar representando esse cenário enquanto não houver decisão diferente de produto.

---

# 27. Encaminhamento para coordenadoria

## RF-023 — Escalonamento

Quando a dúvida exigir análise especializada, a Sala Arthur Saboya deverá encaminhar a solicitação para a coordenadoria responsável.

Quando aplicável, também deverá ser definida a divisão.

O sistema já possui relacionamento da solicitação com:

- `Coordenadoria`;
- `Divisao`.

---

# 28. Agendamento originado pela Sala Arthur Saboya

## RF-024 — Criação do atendimento especializado

Quando for necessária participação de técnico da coordenadoria:

1. solicitação é encaminhada;
2. coordenadoria recebe a demanda;
3. técnico é definido;
4. disponibilidade é consultada;
5. data e horário são definidos;
6. `Agendamento` é criado;
7. solicitação original é vinculada ao agendamento;
8. reunião Microsoft Teams é criada;
9. munícipe recebe os dados da reunião.

Os estados existentes atualmente incluem:

```text
SOLICITADO
RESPONDIDO
AGUARDANDO_DATA
AGENDAMENTO_CRIADO
```

---

# 29. Chamado Arthur Saboya

## RF-025 — Histórico de mensagens

As solicitações da Sala Arthur Saboya deverão manter histórico de mensagens.

A estrutura existente:

```text
SolicitacaoPreProjetoArthurSaboyaMensagem
```

deverá ser reutilizada.

Os tipos de autor existentes são:

```text
MUNICIPE
PONTO_FOCAL
SISTEMA
```

---

## RF-026 — Histórico imutável

As mensagens do chamado não deverão ser sobrescritas.

Eventos relevantes poderão gerar mensagens de sistema, incluindo:

- solicitação criada;
- resposta enviada;
- solicitação encaminhada;
- coordenadoria alterada;
- técnico atribuído;
- data definida;
- agendamento criado;
- reunião criada;
- cancelamento;
- conclusão.

---

# 30. Microsoft Teams

## RF-027 — Situações que criam Teams

Deverá ser criada reunião Teams quando:

1. atendimento de recurso possuir modalidade `ONLINE`;
2. atendimento especializado da Sala Arthur Saboya necessitar reunião com técnico da coordenadoria.

Atendimento presencial não deverá criar Teams.

---

# 31. Dados do Teams já existentes

O modelo atual de `Agendamento` já possui:

```text
teamsEventId
teamsJoinUrl
teamsMeetingId
teamsOrganizerEmail
teamsUltimoErro
```

Esses campos deverão continuar sendo utilizados.

---

# 32. Alteração de reunião

## RF-028 — Remarcação

Quando data ou horário de atendimento online forem alterados, o sistema deverá atualizar a reunião correspondente sempre que possível.

Uma remarcação não deverá criar reuniões duplicadas desnecessariamente.

---

# 33. Cancelamento da reunião

## RF-029 — Sincronização de cancelamento

Quando um atendimento online for cancelado, o sistema deverá tentar cancelar também o evento correspondente no Microsoft Teams.

Falhas de integração deverão ser registradas.

---

# 34. Idempotência

## RN-009 — Criação de reuniões

A integração com Microsoft Graph deverá ser idempotente.

Uma repetição de requisição causada por:

- timeout;
- retry;
- erro de rede;
- repetição de operação

não deverá criar reuniões duplicadas.

---

# 35. Presença em reuniões

## RF-030 — Participantes

A estrutura existente `PresencaReuniao` deverá continuar sendo utilizada para registrar informações obtidas do Microsoft Teams.

Já estão previstos dados como:

- nome;
- e-mail;
- papel;
- duração;
- entrada;
- saída.

Essas informações poderão ser utilizadas para:

- confirmação de realização;
- comparecimento;
- relatórios;
- auditoria.

---

# 36. Status do agendamento

O enum atual possui:

```text
SOLICITADO
AGENDADO
CANCELADO
CONCLUIDO
ATENDIDO
NAO_REALIZADO
```

## RN-010 — Transições

As transições deverão ser controladas.

Fluxo principal:

```text
SOLICITADO
   |
   v
AGENDADO
   |
   v
ATENDIDO
   |
   v
CONCLUIDO
```

Fluxos alternativos:

```text
SOLICITADO -> CANCELADO

AGENDADO -> CANCELADO

AGENDADO -> NAO_REALIZADO
```

A aplicação não deverá permitir alterações arbitrárias que gerem estados inconsistentes.

---

# 37. Cancelamento

## RF-031 — Dados do cancelamento

O modelo atual já possui:

```text
motivoCancelamento
canceladoEm
canceladoPorId
```

Todo cancelamento deverá preservar:

- motivo;
- data/hora;
- responsável pela operação, quando aplicável.

---

# 38. Portal do munícipe

## RF-032 — Funcionalidades

O munícipe deverá poder:

- cadastrar conta;
- autenticar-se;
- recuperar senha;
- pesquisar processo/protocolo;
- consultar recursos elegíveis;
- solicitar atendimento;
- selecionar horário;
- acompanhar solicitações;
- acompanhar status;
- consultar protocolos;
- visualizar mensagens;
- responder chamados quando permitido;
- visualizar agendamentos;
- visualizar link Teams;
- visualizar endereço do atendimento presencial;
- acompanhar alterações;
- acompanhar cancelamentos;
- avaliar atendimento quando aplicável.

---

# 39. Área interna da SMUL

## RF-033 — Operações internas

De acordo com a permissão do usuário, a área interna deverá permitir:

- visualizar fila de solicitações;
- filtrar por status;
- filtrar por coordenadoria;
- filtrar por divisão;
- filtrar por técnico;
- responder chamado;
- encaminhar chamado;
- atribuir técnico;
- atribuir técnico reserva;
- consultar agenda;
- cadastrar agenda;
- cadastrar ausência;
- criar agendamento;
- remarcar;
- cancelar;
- concluir;
- registrar não realização;
- visualizar informações do Teams;
- sincronizar presença;
- pesquisar histórico.

---

# 40. Segurança

## RN-011 — Autorização

Toda autorização deverá ocorrer também no backend.

Ocultar botões na interface não será considerado mecanismo suficiente de segurança.

---

## RN-012 — Isolamento do munícipe

O munícipe somente poderá acessar:

- suas solicitações;
- seus chamados;
- seus agendamentos;
- suas mensagens;
- seus dados.

---

## RN-013 — Integrações

Credenciais do BI, Microsoft Graph, banco e demais serviços não deverão ser expostas ao frontend.

---

# 41. Adequações recomendadas ao modelo de dados

A estrutura existente cobre parte importante do domínio, mas alguns conceitos devem ser tornados explícitos.

## 41.1 Modalidade

Sugestão:

```prisma
enum ModalidadeAgendamento {
  PRESENCIAL
  ONLINE
}
```

---

## 41.2 Origem

Sugestão:

```prisma
enum OrigemAgendamento {
  RECURSO
  ARTHUR_SABOYA
}
```

---

## 41.3 Tipo do recurso

Sugestão:

```prisma
enum TipoRecursoAtendimento {
  DESPACHO
  COMUNIQUE_SE
}
```

---

## 41.4 Campos de contexto do BI

Avaliar inclusão em `Agendamento` ou entidade própria de origem:

```text
tipoRecurso
sistemaOrigem
protocolo
situacaoRecurso
unidadeOrigem
responsavelOriginal
responsavelOriginalRF
```

O campo atual `processo` poderá continuar sendo utilizado para o número do processo.

---

# 42. Nova entidade — AgendaTecnico

Estrutura conceitual:

```text
AgendaTecnico

id
tecnicoId
diaSemana
horaInicio
horaFim
duracaoMinutos
modalidade
vigenciaInicio
vigenciaFim
status
criadoEm
atualizadoEm
```

Um técnico poderá possuir diversas faixas de atendimento.

---

# 43. Nova entidade — AusenciaTecnico

Estrutura conceitual:

```text
AusenciaTecnico

id
tecnicoId
tipo
dataHoraInicio
dataHoraFim
observacao
status
criadoEm
atualizadoEm
```

---

# 44. Local de atendimento

Para atendimento presencial, avaliar armazenamento de:

```text
localAtendimento
sala
orientacaoAcesso
```

Essas informações poderão futuramente ser parametrizadas por unidade.

---

# 45. Fluxo consolidado — Recurso

```text
Munícipe
   |
   v
Informa processo ou protocolo
   |
   v
Backend consulta BI
   |
   +------------------------+
   |                        |
   v                        v
Comunique-se             Despacho
qualquer status          INDEFERIDO
   |                        |
   +-----------+------------+
               |
               v
     Recursos encontrados
               |
               v
   Munícipe seleciona recurso
               |
               v
       Backend revalida BI
               |
               v
    Identifica unidade + RF
               |
               v
       Localiza o técnico
               |
               v
       Verifica ausência
          /           \
         /             \
     Ausente         Disponível
        |                |
        v                v
 Técnico reserva    Agenda técnico
        \                /
         \              /
          +------------+
                |
                v
       Calcula horários
                |
                v
     Munícipe escolhe slot
                |
                v
 Revalida disponibilidade
                |
                v
        Cria agendamento
          /           \
         /             \
  PRESENCIAL          ONLINE
      |                  |
      v                  v
 Local físico       Cria Teams
      \                  /
       +----------------+
               |
               v
          Atendimento
               |
               v
       ATENDIDO / CONCLUÍDO
```

---

# 46. Fluxo consolidado — Arthur Saboya

```text
Munícipe envia dúvida
        |
        v
Sala Arthur Saboya
        |
        +------------------------------+
        |                              |
        v                              v
Dúvida resolvida                Precisa especialista
        |                              |
        v                              v
Técnico responde                Encaminha coordenadoria
        |                              |
        v                              v
Fecha chamado                  Define técnico
                                       |
                                       v
                                Consulta agenda
                                       |
                                       v
                                 Define horário
                                       |
                                       v
                               Cria agendamento
                                       |
                                       v
                                Cria Teams
                                       |
                                       v
                                  Atendimento
```

---

# 47. Critérios de aceite — Processo/recurso

## CA-R01

Dado um despacho com situação diferente de `INDEFERIDO`, quando o munícipe tentar solicitar atendimento, o sistema deverá impedir a solicitação.

## CA-R02

Dado um despacho `INDEFERIDO`, quando as demais condições forem atendidas, o sistema deverá permitir o prosseguimento.

## CA-R03

Um comunique-se deverá ser considerado elegível independentemente de sua situação enquanto não houver definição oficial dos status permitidos.

## CA-R04

O sistema deverá permitir busca por processo ou protocolo.

## CA-R05

Quando existirem várias ocorrências, o sistema deverá permitir identificar/selecionar a ocorrência desejada.

## CA-R06

A unidade e o responsável deverão ser obtidos do registro selecionado no BI.

---

# 48. Critérios de aceite — Agenda

## CA-AG01

O sistema não deverá apresentar horário fora da agenda cadastrada do técnico.

## CA-AG02

O sistema não deverá apresentar horário ocupado.

## CA-AG03

O sistema não deverá apresentar horário pertencente a uma ausência.

## CA-AG04

O backend deverá impedir dupla reserva mesmo que dois usuários tentem confirmar simultaneamente o mesmo horário.

## CA-AG05

Quando o técnico estiver em ausência impeditiva, a demanda deverá entrar no fluxo de técnico reserva.

## CA-AG06

O responsável original retornado pelo BI deverá permanecer registrado mesmo quando outro técnico realizar o atendimento.

---

# 49. Critérios de aceite — Teams

## CA-T01

Atendimento presencial não deverá gerar reunião Teams.

## CA-T02

Atendimento online confirmado deverá gerar reunião Teams.

## CA-T03

O link da reunião deverá ser disponibilizado ao munícipe.

## CA-T04

Uma remarcação deverá atualizar a reunião sempre que possível.

## CA-T05

Um cancelamento deverá tentar cancelar a reunião correspondente.

## CA-T06

Falhas de integração deverão ser registradas e não deverão ser silenciosas.

---

# 50. Critérios de aceite — Arthur Saboya

## CA-A01

Nova solicitação deverá gerar protocolo.

## CA-A02

Técnico da Sala Arthur Saboya deverá poder responder diretamente à dúvida.

## CA-A03

Quando a dúvida for resolvida diretamente, nenhum `Agendamento` deverá ser criado.

## CA-A04

Quando for necessária análise especializada, a solicitação deverá poder ser encaminhada para uma coordenadoria.

## CA-A05

A solicitação encaminhada deverá permanecer relacionada ao chamado original.

## CA-A06

Após definição de técnico e horário, deverá ser criado um `Agendamento`.

## CA-A07

O atendimento especializado deverá possuir reunião Teams.

## CA-A08

O histórico do chamado deverá ser preservado.

---

# 51. Métricas futuras

O sistema deverá permitir futuramente extrair indicadores como:

- solicitações por período;
- atendimentos por coordenadoria;
- atendimentos por divisão;
- atendimentos por técnico;
- comunique-ses atendidos;
- despachos atendidos;
- atendimentos presenciais;
- atendimentos online;
- cancelamentos;
- não comparecimentos;
- taxa de realização;
- tempo médio até atendimento;
- tempo médio de resolução;
- solicitações Arthur Saboya;
- solicitações Arthur Saboya resolvidas sem reunião;
- solicitações Arthur Saboya encaminhadas;
- taxa de escalonamento da Sala Arthur Saboya;
- utilização da agenda dos técnicos.

---

# 52. Pontos ainda pendentes de definição

As seguintes decisões ainda precisam ser detalhadas:

1. quais situações de `situacaoComuniquese` serão elegíveis no futuro;
2. forma exata de conexão ao banco BI;
3. relacionamento entre `unidadeComuniquese` / `unidadeDespacho` e `Coordenadoria` / `Divisao`;
4. duração padrão dos atendimentos;
5. antecedência mínima para agendamento;
6. quantidade de dias futuros disponibilizados;
7. regras de remarcação;
8. regras de cancelamento pelo munícipe;
9. modalidade disponível por unidade;
10. locais de atendimento presencial;
11. SLA da Sala Arthur Saboya;
12. SLA das coordenadorias;
13. tipos oficiais de ausência;
14. regra exata de escolha/atribuição do técnico reserva;
15. templates de e-mail;
16. política de anexos;
17. regras de avaliação do atendimento.

Esses pontos não devem ser assumidos pelos agentes sem confirmação ou evidência no código existente.

---

# 53. Orientações para agentes de desenvolvimento

Antes de alterar funcionalidades relacionadas a este domínio:

1. Ler este documento;
2. Inspecionar a implementação atual;
3. Reutilizar entidades, serviços, componentes e status existentes quando compatíveis;
4. Não criar um segundo fluxo paralelo para funcionalidades que já existem;
5. Preservar compatibilidade com dados existentes;
6. Tratar o BI como fonte somente de leitura;
7. Validar regras críticas no backend;
8. Preservar histórico e rastreabilidade;
9. Evitar alterações destrutivas de schema sem estratégia de migração;
10. Verificar o fluxo atual de importação de planilha antes de alterar o conceito de técnico reserva;
11. Verificar a implementação atual de Microsoft Graph/Teams antes de criar uma nova integração;
12. Não assumir regras de negócio listadas como pendentes neste documento.

---

# 54. Resumo das decisões consolidadas

1. O Portal possui dois grandes fluxos: **recursos** e **Sala Arthur Saboya**.
2. A pesquisa de recurso aceita **processo ou protocolo**.
3. O BI é a fonte de verdade para despacho e comunique-se.
4. `dbo.prata_comuniquese` será utilizada para comunique-ses.
5. `dbo.prata_despacho` será utilizada para despachos.
6. Neste momento, qualquer situação de comunique-se é elegível.
7. Despacho somente é elegível quando estiver **INDEFERIDO**.
8. A unidade retornada pelo BI orienta o roteamento do atendimento.
9. O RF retornado pelo BI identifica o técnico originalmente responsável.
10. O sistema deverá preservar o responsável original.
11. Técnicos possuirão agenda própria.
12. Técnicos poderão possuir períodos de ausência.
13. Horários disponíveis resultam de agenda menos ausências e agendamentos existentes.
14. Técnico ausente deverá acionar o fluxo existente de **técnico reserva**.
15. Atendimento de recurso poderá ser presencial ou online.
16. Atendimento online deverá utilizar Microsoft Teams.
17. Atendimento presencial não deverá criar Teams.
18. Sala Arthur Saboya é destinada a dúvidas de pré-projeto.
19. A Sala Arthur Saboya poderá solucionar a dúvida sem criar agendamento.
20. Quando precisar de especialista, encaminhará a demanda para a coordenadoria.
21. Nesse caso será criado agendamento e reunião Teams.
22. Solicitação/chamado e agendamento são conceitos distintos.
23. O Portal gerencia o atendimento; não altera o andamento administrativo do processo.
24. Regras ainda não definidas não deverão ser inventadas durante a implementação.
