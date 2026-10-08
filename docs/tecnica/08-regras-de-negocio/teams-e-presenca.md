# Microsoft Teams e presença

Fontes: [lib/agendamentos-teams.ts](../../../lib/agendamentos-teams.ts), [lib/teams-graph.ts](../../../lib/teams-graph.ts), [lib/reuniao-teams-titulos.ts](../../../lib/reuniao-teams-titulos.ts), [lib/outlook-agendamento-teams.ts](../../../lib/outlook-agendamento-teams.ts), [app/api/internal/teams-sync/route.ts](../../../app/api/internal/teams-sync/route.ts).

## Pré-requisitos

- Credenciais Azure no ambiente (`AZURE_*`). Ver [03-configuracao-ambiente.md](../03-configuracao-ambiente.md#microsoft-graph--teams).
- **Caixa organizadora**: e-mail salvo em `configuracoes_sistema.TEAMS_ORGANIZER_EMAIL`. Se estiver vazio, usa a constante `EMAIL_MARCADOR_REUNIOES_PADRAO`. ADM/DEV editam e testam o e-mail em **Configurações**; o teste (`testarConexaoGraphInterno`) consulta a caixa no Graph.

## Criação da reunião

`criarReuniaoTeamsSePossivel(agendamentoId)`:

| Condição | Resultado |
|---|---|
| Modalidade presencial | Não cria ("Atendimento presencial não utiliza reunião Teams.") |
| Já tem `teamsEventId` | Nada a fazer |
| Status diferente de SOLICITADO/AGENDADO | Não cria |
| Sem técnico | "Atribua um técnico antes de agendar a reunião." |
| Faltando e-mail do técnico, do munícipe ou da coordenadoria (e do técnico Arthur Saboya, nesse fluxo) | Grava o erro e avisa os pontos focais |

**Participantes**: técnico, munícipe e e-mail da coordenadoria. No fluxo Arthur Saboya entram também o técnico Arthur Saboya e a caixa da Sala Arthur Saboya.

**Título**:

- técnico: `Agendamento Técnico - {sigla da coordenadoria} - Processo: {processo}`;
- Arthur Saboya: `Sala Arthur Saboya - Protocolo: {protocolo}`.

**Corpo**: condições do atendimento técnico (`corpoHtmlCondicoesAtendimentoTecnicoOutlook`).

**Duração**: `dataFim`, ou 60 min (30 min no Arthur Saboya).

**Depois de criar**:

- grava `teamsEventId`, `teamsJoinUrl`, `teamsMeetingId` e `teamsOrganizerEmail`;
- **um `SOLICITADO` passa para `AGENDADO`**, com o evento `STATUS_ALTERADO` (`origem: TEAMS`);
- no fluxo Arthur Saboya, a solicitação passa para `AGENDAMENTO_CRIADO` e o munícipe recebe uma mensagem automática no chamado.

**Quando é disparada**:

- ao atribuir o primeiro técnico ([ciclo-de-vida-agendamento.md](ciclo-de-vida-agendamento.md#efeitos-colaterais));
- pelo botão de agendar reunião (PF/COORD/ADM/DEV);
- em lote, ao fim da importação da planilha SMUL;
- pela fila de sincronização.

## Aviso de falha

Quando a criação falha por motivo relevante (credenciais, caixa organizadora, e-mails ausentes, erro do Graph):

- um e-mail é enviado pelo Graph (`Mail.Send`) a partir da caixa organizadora;
- destinatários: PONTO_FOCAL/COORDENADOR ativos da coordenadoria ou, se não houver, o e-mail da coordenadoria;
- o e-mail traz o link do agendamento e sugere agendar manualmente (botão no sistema ou Outlook).

Falta de técnico, agendamento inexistente e status final não geram aviso.

## Fila de sincronização

Toda mudança que afeta uma reunião existente apenas **marca a intenção**:

- `teamsSyncPendente = true`
- `teamsSyncVersao += 1`
- `teamsSyncTentativas = 0`

`sincronizarReuniaoTeamsPendente` então:

1. **Reivindica** o item com uma trava de 5 min (`teamsSyncEmProcessamentoAte`) e soma uma tentativa.
2. Executa conforme o estado:
   - cancelado com evento → cancela no Teams com o motivo;
   - presencial com evento → erro de divergência;
   - online sem evento → cria;
   - online com evento → atualiza horário e participantes.
3. Só limpa a pendência se a versão não mudou durante o processamento. Se der erro, grava `teamsUltimoErro`.

`POST /api/internal/teams-sync` (Bearer `TEAMS_SYNC_SECRET`, comparação em tempo constante) processa até 20 pendentes com menos de 5 tentativas, dos mais antigos para os mais novos. **Pendente de confirmação**: Precisa de um agendador externo ([05-implantacao.md](../05-implantacao.md#tarefa-agendada-obrigatória)).

O portal mostra "Teams pendente" ao munícipe enquanto a sincronização não termina.

## Presença e resultado

`sincronizarPresencaInterno` (botão "Atualizar presença" em [reuniao-teams-dialog.tsx](../../../app/(rotas-auth)/_components/reuniao-teams-dialog.tsx); perfis ADM, DEV, TEC — só os próprios — e PF/COORD — só da coordenadoria):

1. Só se aplica a agendamentos `AGENDADO` com reunião. Status finais apenas devolvem os dados.
2. Antes do fim da reunião: "aguardando relatório".
3. Sem `force`, não consulta de novo se a última consulta tiver menos de 10 min.
4. Busca o `meetingId` pelo link, se necessário, e lê o relatório de presença.
5. **Com relatório**:
   - as presenças são substituídas;
   - se alguém participou mais de 0 s → `ATENDIDO`;
   - senão → `NAO_REALIZADO`.
6. **Sem relatório**:
   - até **45 min** após o fim: continua aguardando;
   - depois disso: `NAO_REALIZADO`.
7. Toda mudança gera `STATUS_ALTERADO` (`origem: TEAMS`).

**Pendente de confirmação**: A presença só é sincronizada quando alguém aciona o botão. Não há rotina automática no repositório.

## Alternativa manual (Outlook)

[lib/outlook-agendamento-teams.ts](../../../lib/outlook-agendamento-teams.ts) monta o texto e o HTML do convite e abre o compose do Outlook. Hoje é usado no chamado Arthur Saboya ([chamado-pre-projeto-portal-view.tsx](../../../app/(rotas-auth)/pedidos-pre-projetos-arthur-saboya/_components/chamado-pre-projeto-portal-view.tsx)), quando a criação automática falha.

## Script de lote ⚠

[scripts/criar-reunioes-teams-lote.ts](../../../scripts/criar-reunioes-teams-lote.ts) cria reuniões a partir de uma lista fixa no código. Ver riscos em [11-pendencias-e-riscos.md](../11-pendencias-e-riscos.md).
