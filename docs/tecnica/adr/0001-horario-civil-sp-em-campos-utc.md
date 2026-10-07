# ADR 0001 — Horário civil de São Paulo gravado em campos UTC

- **Status**: vigente (decisão inferida do código ❓ confirmar com a equipe)
- **Data do registro**: 07/10/2026

## Contexto

O MySQL guarda `DateTime` sem fuso, e o Prisma serializa em UTC. As planilhas importadas e as escolhas do munícipe vêm em horário de Brasília.

## Decisão (como está implementada) ✅

Os campos de data/hora de agendamento, agenda e ausência guardam o **horário civil de São Paulo como se fosse UTC**. Exemplo: um atendimento às 14:00 de Brasília fica gravado como `14:00Z`.

Evidências:

- [lib/agendamentos-core.ts](../../../lib/agendamentos-core.ts) — `instanteCivilSaoPauloSemDeslocamento` usa `Date.UTC(...)` com os componentes locais; `formatarDataHoraSaoPaulo` lê com `getUTC*`;
- [lib/agenda-tecnicos.ts](../../../lib/agenda-tecnicos.ts) — `dataCivil`/`dataHoraCivil` usam o sufixo `Z`; `agoraCivil()` converte "agora" para o horário civil de SP;
- [lib/portal-processos-core.ts](../../../lib/portal-processos-core.ts) — `parseDataHoraCivil`.

## Consequências

- Exibir e comparar datas exige usar as funções de UTC (`getUTCHours`, `toISOString().slice(...)`), não as locais.
- Para comparar com o instante real (ex.: "faltam 24 h?", "a reunião já terminou?") é preciso converter, somando 3 h. Feito em [lib/date-time.ts](../../../lib/date-time.ts) (`instanteUtcRealDesdeDataHoraApi`, `reuniaoJaTerminou`) e em `finalizarSemRelatorio` ([lib/agendamentos-teams.ts](../../../lib/agendamentos-teams.ts)).
- As chamadas ao Microsoft Graph precisam informar o fuso de São Paulo.
- O deslocamento fixo de 3 h pressupõe que não há horário de verão.
- A rota [api/debug/time](../../../app/api/debug/time/route.ts) existe para diagnosticar o fuso do servidor.
