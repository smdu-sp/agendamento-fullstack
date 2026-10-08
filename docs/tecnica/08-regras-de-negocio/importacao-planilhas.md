# Importação de planilhas

Fontes: [lib/agendamentos-import.ts](../../../lib/agendamentos-import.ts), [importar-planilha.ts](../../../services/agendamentos/server-functions/importar-planilha.ts), [importar-planilha-outlook.ts](../../../services/agendamentos/server-functions/importar-planilha-outlook.ts).

Acesso: **ADM e DEV**. Arquivo Excel (`.xlsx` ou `.xls`), limite de 10 MB, validado na action e em `serverActions.bodySizeLimit` ([next.config.ts](../../../next.config.ts)).

## Planilha padrão SMUL

Relatório do "Sistema de Agendamento Eletrônico".

- **Cabeçalho**: procurado automaticamente (padrão: linha 9). Colunas esperadas: Nro. Processo, Nro. Protocolo, CPF, Requerente, E-mail Munícipe, Tipo Agendamento, Local de Atendimento, RF Técnico, Técnico, E-mail Técnico, Agendado para. Os nomes são reconhecidos com tolerância a variações (`buscarValor` / `buscarPorPalavraChave`).
- **Linhas ignoradas**: vazias, títulos ("Sistema de Agendamento Eletrônico", "Relatório de Agendamentos") e repetições do cabeçalho.
- **Data/hora**: aceita texto ou número serial do Excel e grava como horário civil de São Paulo ([ADR 0001](../adr/0001-horario-civil-sp-em-campos-utc.md)). Duração de 60 min.
- **Tipo de agendamento**: buscado pelo texto; é criado se não existir.
- **Telas de envio**: a página **Importar Agendamentos** ([importar-planilha-form.tsx](../../../app/(rotas-auth)/importar-planilha/_components/importar-planilha-form.tsx)) envia só o arquivo. O componente da página inicial ([_components/importar-planilha.tsx](../../../app/(rotas-auth)/_components/importar-planilha.tsx)) permite escolher também uma coordenadoria.
- **Coordenadoria**: o `coordenadoriaId` opcional enviado no formulário, ou a sigla de "Local de Atendimento" (criada se não existir).
- **Técnico**:
  - "TÉCNICO RESERVA {SIGLA}" → sem técnico; a sigla define a coordenadoria;
  - senão, pelo **RF** (ver abaixo).
- **Duplicatas**: mesmo processo + mesma data/hora → ignorada e contada como duplicada.
- **Gravação**: `status = SOLICITADO`, `importado = true`; a divisão vem do técnico.
- **Teams**: ao final, cria em lote as reuniões dos agendamentos com técnico, exceto os do tipo Arthur Saboya. As falhas são avisadas por e-mail aos pontos focais ([teams-e-presenca.md](teams-e-presenca.md)).
- **Resultado**: importados, erros, duplicados, reuniões criadas e reuniões com falha. Grava `log_importacao_planilha`; a data da última importação aparece na tela inicial.

## Planilha Outlook

- O título contém "Data:" e os registros começam na linha 5. Colunas: Tipo de Atendimento, Visitante, CPF, Horário, Unidade, Número do Processo, Técnico Responsável.
- Visitante e horário são obrigatórios.
- **Unidade → coordenadoria**: sigla exata; senão, coordenadoria ativa cuja sigla ou nome contenha o texto.
- **Duplicatas**: mesmo processo, data/hora e coordenadoria entre os já importados do Outlook.
- **Gravação**: `importadoOutlook = true`, **sem técnico**; o nome do técnico vai como texto em `tecnicoResponsavelPlanilha`. Duração de 60 min, `SOLICITADO`. Não cria reuniões.
- Grava `log_importacao_outlook`.

## Técnico pelo RF

`buscarOuCriarTecnicoPorRF` ([lib/agendamentos-core.ts](../../../lib/agendamentos-core.ts)):

1. Login = `d` + 6 primeiros dígitos do RF.
2. **Usuário existe** → usa esse usuário e, se ele não tiver divisão, tenta preenchê-la.
3. **Usuário não existe** → busca no AD (nome e e-mail, empresa SMUL).
   - Se o AD falhar ou não achar, cria um usuário básico: nome = login, e-mail da planilha ou `{login}@smul.prefeitura.sp.gov.br`.
   - O usuário é criado com perfil **TEC**.
4. **Divisão**, nesta ordem:
   1. pelo SGU (sigla da unidade do servidor);
   2. senão, a primeira divisão ativa (ordem alfabética) da coordenadoria da importação.
