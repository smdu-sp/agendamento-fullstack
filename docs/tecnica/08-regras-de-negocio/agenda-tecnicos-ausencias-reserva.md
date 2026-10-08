# Agenda dos técnicos, ausências e técnico reserva

Fontes: [lib/agenda-slots.ts](../../../lib/agenda-slots.ts) (lógica pura, testada em [tests/agenda-slots.test.ts](../../../tests/agenda-slots.test.ts)), [lib/agenda-tecnicos.ts](../../../lib/agenda-tecnicos.ts), [services/agendamentos/server-functions/agenda-tecnicos.ts](../../../services/agendamentos/server-functions/agenda-tecnicos.ts), tela [agenda-tecnicos-panel.tsx](../../../app/(rotas-auth)/agenda-tecnicos/_components/agenda-tecnicos-panel.tsx).

## Quem gerencia

ADM, DEV, PONTO_FOCAL, COORDENADOR e DIRETOR. PF, COORD e DIRETOR veem e alteram só técnicos da **própria coordenadoria**; sem coordenadoria, não veem nenhum técnico. TEC pode consultar a disponibilidade da própria agenda. Só técnicos ativos que podem ser atribuídos (TEC, ou DEV com divisão) aparecem.

## Regra de agenda (faixa recorrente)

| Campo | Regra |
|---|---|
| Dia da semana | 0 (domingo) a 6 (sábado) |
| Início / fim | Formato `HH:mm`; o fim precisa ser depois do início |
| Duração | Inteiro de 5 minutos até o tamanho da faixa |
| Modalidade | PRESENCIAL ou ONLINE |
| Vigência | Início obrigatório; fim opcional, nunca antes do início |

- Faixas ativas do mesmo técnico, no mesmo dia e modalidade, com vigências que se cruzam, **não podem se sobrepor** ("Esta faixa se sobrepõe a outra regra ativa do técnico."). Isso vale ao criar e ao reativar.
- As regras não são apagadas: são ativadas e desativadas.

## Geração de slots

Para um dia e uma modalidade:

1. Pegam-se as regras ativas daquele dia da semana, dentro da vigência.
2. Cada faixa é dividida em slots do tamanho da duração.
3. Saem os slots que cruzam **ausências ativas** ou **agendamentos ativos** do técnico. Agendamentos `CANCELADO` e `NAO_REALIZADO` liberam o horário; agendamentos sem fim contam como 60 min.
4. Saem os horários que já passaram (hora civil de São Paulo).
5. Slots repetidos são unidos e o resultado é ordenado.

`exigirSlotLivre` só aceita um intervalo que coincida **exatamente** com um slot gerado e fique dentro de um mesmo dia. Toda reserva bloqueia o técnico com `SELECT ... FOR UPDATE` antes de conferir, o que impede dupla reserva concorrente.

## Ausências

| Campo | Regra |
|---|---|
| Tipo | Texto livre de 1 a 80 caracteres (ex.: férias, licença) |
| Início / fim | `AAAA-MM-DDTHH:mm`; o fim precisa ser depois do início |
| Observação | Opcional |

- Ao cadastrar uma ausência, os agendamentos `AGENDADO` do técnico que cruzam o período recebem o evento **`CONFLITO_AUSENCIA`**. A ação devolve a lista dos afetados.
- A aba de ausências mostra os conflitos atuais (`listarConflitosAusencia`), com atalho "Abrir atendimento". **O sistema não remarca nem reatribui sozinho**: quem gerencia a agenda decide o que fazer.
- As ausências são ativadas e desativadas, nunca apagadas.

## Técnico reserva

- **Portal**: se o técnico do BI está ausente no horário escolhido, o agendamento é criado **sem técnico**, com `encaminhadoReservaEm` e `motivoEncaminhamentoReserva`, e o responsável original fica no snapshot do BI. A coordenadoria então atribui outro técnico, o que gera o evento `ATRIBUIDO_RESERVA`.
- **Planilha SMUL**: a linha com "TÉCNICO RESERVA {SIGLA}" fica sem técnico. A sigla é usada para achar a coordenadoria.
- **Pendente de confirmação**: Não existe um cadastro de quem são os técnicos reserva. A escolha é manual.
