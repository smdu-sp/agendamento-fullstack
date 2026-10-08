# Ponto focal e coordenador

Você organiza os atendimentos da sua área:

- **Coordenador**: todos os agendamentos da coordenadoria.
- **Ponto focal**: os agendamentos da sua divisão, mais os da coordenadoria que ainda estão sem técnico.

## Rotina diária

1. Na página inicial, filtre a situação **Solicitado** para ver o que falta encaminhar.
2. Linhas em **amarelo** estão sem técnico ou já agendadas. Linhas em **vermelho** vieram da planilha do Outlook.
3. Fique atento a:
   - pedidos marcados **Técnico reserva** (o responsável original está ausente);
   - pedidos encaminhados pela CAP.
4. Para cada pedido, atribua o técnico e, se for online, garanta que a reunião do Teams foi criada.

## Atribuir técnico

Na coluna **Técnico**, use o seletor de técnico. Ele aparece para pedidos que já têm coordenadoria e ainda não foram encerrados.

1. Busque o técnico ("Buscar técnico..."). Só aparecem técnicos da sua coordenadoria.
2. **Pedidos vindos do portal com modalidade definida**: escolha a **Data para atribuição** e um horário livre na agenda do técnico. Se aparecer "Sem horários livres nesta data. Escolha outra data.", tente outro dia ou outro técnico. O agendamento passa a usar o horário escolhido.
3. **Demais pedidos**: o técnico é atribuído no horário já registrado.
4. Se for o primeiro técnico de um pedido **online**, o sistema cria a reunião do Teams e o pedido passa para **Agendado** ("Técnico atribuído e reunião Teams criada").

Se aparecer "O agendamento foi alterado por outra pessoa. Atualize a página.", recarregue a página e repita.

## Reunião do Teams

Na lista, use **Agendar reunião** ou **Ver reunião**. A seção **Reunião Teams** do detalhe do agendamento abre a mesma janela.

- **Agendar reunião** / **Tentar agendar novamente**: aparece para pedidos **Solicitados** com técnico. Use quando a criação automática falhou. Se o sistema não conseguir criar, você recebe um e-mail "Falha ao agendar reunião Teams" com o motivo, por exemplo falta do e-mail do munícipe, do técnico ou da coordenadoria.
- **Cancelar reunião**: aparece quando há reunião ou o pedido está **Agendado**. Informe o **motivo do cancelamento** (mínimo de 5 caracteres). **Isso cancela também o agendamento**.
- **Atualizar presença** e **Lista de presença**: depois do horário da reunião, mostram quem entrou e por quanto tempo, e registram o resultado.

## Registrar o resultado

Quando o atendimento está **Atendido**, o botão **Alterar** permite marcá-lo como **Concluído**. Veja também [Técnico](tecnico.md).

## Ausências que afetam agendamentos

Quando uma ausência é cadastrada para um técnico com atendimentos confirmados, eles aparecem como conflito em **Agenda dos técnicos → Ausências**. Veja [agenda dos técnicos](agenda-dos-tecnicos.md). Abra cada atendimento e troque o técnico.

## O que ainda não pode ser feito pelas telas

**Pendente de confirmação**: o sistema aceita estas operações, mas as telas atuais não oferecem:

- informar **local, sala e orientações de acesso** de atendimentos presenciais, nem confirmar um atendimento presencial (o sistema exige o local para confirmar);
- **remarcar** a data de um agendamento já atribuído;
- **cancelar** um pedido que ainda não tem reunião e não está agendado.

Procure a equipe de sistemas nesses casos.

## Usuários da sua divisão

Em **Usuários** você pode:

- **cadastrar** um servidor: busque pelo **login de rede** (nome e e-mail vêm da rede da Prefeitura) e escolha o perfil. Você pode atribuir apenas **Usuário**, **Ponto Focal** ou **Técnico**. Os outros perfis da lista são recusados pelo sistema. A pessoa é cadastrada na sua divisão.
- **editar** o perfil ou **remover** (desativar) usuários da sua divisão.

Se a pessoa buscada já tinha cadastro desativado, a busca reativa o acesso dela.

Se a pessoa já tiver cadastro ativo, aparece "Já existe cadastro para este usuário. Contate um administrador para alterar a divisão desta pessoa." ou "Login já cadastrado."

## Outras telas

- [Agenda dos técnicos](agenda-dos-tecnicos.md)
- [Dashboard](dashboard.md)
- **Configurações**: mostra o e-mail organizador das reuniões (só leitura).
- **Motivos**: o sistema permite que você cadastre motivos de não atendimento. **Pendente de confirmação**: o item Motivos não aparece no seu menu.
- [Conferência CAP](conferencia-cap.md), se você for da CAP.
- [Pedidos Arthur Saboya](pedidos-arthur-saboya.md)
