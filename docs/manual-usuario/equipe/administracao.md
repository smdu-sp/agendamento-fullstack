# Administração

Tarefas exclusivas do perfil **Administrador**. Os administradores também têm acesso a todas as telas descritas para as outras funções.

## Usuários

Em **Usuários**:

- **Cadastrar**: busque pelo **login de rede**; nome e e-mail vêm da rede. Escolha a **Permissão** e a **Divisão**.
  - Perfis disponíveis: Desenvolvedor, Administrador, Coordenador, Portaria, Usuário, Ponto Focal, Diretor, Técnico, Técnico Arthur Saboya e Administrador Arthur Saboya. Se você escolher Desenvolvedor, o usuário é gravado como Administrador.
  - Perfis da Sala Arthur Saboya são colocados automaticamente na divisão da sala.
  - Para técnicos sem divisão informada, o sistema tenta descobrir a divisão pelo cadastro funcional (SGU).
- **Editar** permissão, divisão ou situação.
- **Remover** (desativar) quem não deve mais acessar ("Tem certeza que deseja remover esse usuário?").
- **Ativar** de novo um usuário desativado ("Tem certeza que deseja ativar esse usuário?").
- A divisão define o que a pessoa vê. Ponto focal, coordenador, diretor e técnico **sem divisão** ficam sem agendamentos visíveis.

## Munícipes

Em **Munícipes** ficam as contas criadas pelos cidadãos no portal. Busque pelo **nome ou e-mail** e filtre por **Status**. A lista mostra a data de cadastro, o último acesso e quantos agendamentos e pedidos de pré-projeto cada conta tem.

- **Editar**: corrige o nome ou o e-mail de acesso. O e-mail não pode ser igual ao de outra conta.
- **Resetar senha**: gera uma **senha temporária** de 10 caracteres. Ela aparece **uma única vez**: copie e repasse ao munícipe. A senha anterior deixa de funcionar e links de "Esqueci minha senha" já enviados são invalidados.
- **Desativar**: bloqueia o acesso ao portal na hora, inclusive de quem já está conectado. Os agendamentos e pedidos da conta continuam no sistema.
- **Ativar**: devolve o acesso a uma conta desativada.

## Cadastros básicos

| Tela | Para quê | Cuidado |
|---|---|---|
| **Coordenadorias** | Sigla, nome e **e-mail** | O e-mail da coordenadoria é convidado nas reuniões do Teams e recebe avisos de falha quando não há ponto focal |
| **Divisões** | Sigla, nome e coordenadoria | A sigla é usada para reconhecer a unidade vinda do BI e do SGU. Use a mesma sigla dos sistemas da Prefeitura |
| **Tipos de Agendamento** | Classificar os atendimentos | Tipos novos também são criados automaticamente na importação. Não renomeie "Pré-projetos (Arthur Saboya)" nem os tipos do portal |
| **Motivos de não atendimento** | Lista usada ao marcar "Não realizado" | — |

Os itens são **desativados**, não apagados.

## Agendamentos

Os agendamentos entram no sistema pelo portal e pelas importações. Na lista, a administração:

- usa **Agendar reunião**, **Ver reunião** e **Cancelar reunião**, como o ponto focal ([como funciona](ponto-focal-e-coordenador.md#reunião-do-teams));
- troca o técnico só de atendimentos **Atendidos** ou **Não realizados**.

**Pendente de confirmação**: o sistema tem funções para criar agendamentos avulsos e para cancelar qualquer agendamento ("Cancelado pela administração."), mas nenhuma tela atual as oferece.

## Importar Agendamentos (planilha SMUL)

1. Exporte o "Relatório de Agendamentos" do Sistema de Agendamento Eletrônico em Excel.
2. Em **Importar Agendamentos**, selecione o **Arquivo Excel** (até 10 MB) e envie. O botão de importação no topo da página inicial faz o mesmo e permite escolher uma coordenadoria para todos os registros da planilha.
3. O resultado mostra importados, erros, duplicados e reuniões criadas ou com falha.

Regras:

- linhas iguais (mesmo processo, data e hora) são ignoradas;
- técnicos são localizados pelo RF e cadastrados automaticamente se não existirem;
- linhas com "TÉCNICO RESERVA" ficam sem técnico, para o ponto focal atribuir;
- reuniões do Teams são criadas para os agendamentos que já têm técnico;
- a data da última importação aparece na página inicial.

## Importar Outlook

1. Exporte a planilha do Outlook (título com "Data:" e registros a partir da linha 5; colunas Tipo de Atendimento, Visitante, CPF, Horário, Técnico Responsável, Unidade, Número do Processo).
2. Em **Importar Outlook**, envie o arquivo.

Os agendamentos entram **sem técnico atribuído**. O nome do técnico da planilha fica só como referência.

## Configurações — Reuniões Microsoft Teams

- **E-mail do organizador (marcador)**: conta institucional que cria os convites. Se ficar vazio, vale o padrão da instituição.
- **Testar Graph**: confirma se o sistema consegue usar essa conta.
- Se as reuniões pararem de ser criadas, confira o e-mail organizador e acione a equipe de sistemas para verificar a integração.

## Ferramentas do perfil Desenvolvedor

O perfil **Desenvolvedor** é destinado à equipe de sistemas. Ele pode **personificar** outro perfil ("Personificar permissão") para testar telas e acessa ferramentas de diagnóstico, como o preview de e-mails.
