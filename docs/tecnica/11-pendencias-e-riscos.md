# 11. Pendências e riscos

Itens encontrados na análise do código (07/10/2026). As correções não fazem parte desta documentação; cada item precisa de responsável e decisão.

## Riscos de segurança e privacidade

| # | Item | Evidência | Impacto | Sugestão |
|---|---|---|---|---|
| S1 | **TEC pode alterar a permissão de qualquer usuário** | [usuarios/server-functions/atualizar.ts](../../services/usuarios/server-functions/atualizar.ts): TEC passa em `verificarPermissoes`; a checagem `usuarioAntes.permissao === 'TEC' && id !== usuarioAntes.id` nunca é verdadeira; `validaPermissaoCriador` não restringe o criador TEC | Escalada de privilégio (ex.: TEC → ADM) chamando a Server Action diretamente | Restringir o TEC ao próprio `id` e a campos de perfil (nome social, avatar), sem `permissao`/`divisaoId`/`status` |
| S2 | **Dados pessoais fixos no código** | [scripts/criar-reunioes-teams-lote.ts](../../scripts/criar-reunioes-teams-lote.ts): lista de processos e e-mails de munícipes e servidores | Exposição de dados pessoais no histórico do Git (LGPD) | Mover os dados para um arquivo de entrada fora do repositório e avaliar a limpeza do histórico |
| S3 | Detalhe do agendamento sem checagem de escopo | [buscar-por-id.ts](../../services/agendamentos/query-functions/buscar-por-id.ts) só confere o perfil | TEC, PF, DIRETOR ou PORTARIA leem qualquer agendamento (CPF, e-mail, telefone) se souberem o ID | Aplicar o mesmo escopo da listagem |
| S4 | `ENVIRONMENT=local` desliga o LDAP | [lib/auth-core.ts](../../lib/auth-core.ts) | Se configurado por engano em produção, qualquer senha entra | Bloquear essa opção quando `NODE_ENV=production` |
| S5 | Filtro LDAP sem escape | [lib/ldap.ts](../../lib/ldap.ts) e [buscar-novo.ts](../../services/usuarios/query-functions/buscar-novo.ts) montam `(sAMAccountName=${login})` | Injeção em filtro LDAP (risco baixo; só ADM/PF/COORD buscam) | Escapar caracteres especiais (RFC 4515) |
| S6 | Endpoint público de diagnóstico | [app/api/debug/time/route.ts](../../app/api/debug/time/route.ts) | Expõe dados do servidor (baixo) | Remover ou proteger |
| S7 | Token do munícipe no `localStorage`, válido por 7 dias, sem revogação | [lib/municipe-sessao.ts](../../lib/municipe-sessao.ts) | Exposto a XSS; logout não invalida o token no servidor | Avaliar cookie httpOnly e validade menor |
| S8 | Sem limite de tentativas | Login de servidores e de munícipes | Força bruta | Rate limiting no proxy ou na aplicação |
| S10 | PF/COORD **sem divisão** listam todos os usuários | [usuarios/query-functions/buscar-tudo.ts](../../services/usuarios/query-functions/buscar-tudo.ts) só filtra se houver `divisaoId` | Exposição de dados de servidores fora do escopo | Devolver lista vazia, como faz a listagem de agendamentos |
| S11 | A busca na rede reativa usuários inativos | [buscar-novo.ts](../../services/usuarios/query-functions/buscar-novo.ts) muda `status` para `true` numa operação de consulta, sem checar a divisão | PF/COORD reativam usuários de qualquer divisão; a reativação não deveria ser efeito de uma busca | Separar a reativação e aplicar o escopo |
| S9 | `verificarPermissoes` libera `permissaoReal === 'ADM'` | [lib/authz.ts](../../lib/authz.ts) | Código sem efeito (só DEV personifica) | Remover ou documentar a intenção |

## Pendências funcionais e de configuração

> **Pendente de confirmação.**

| # | Item | Evidência |
|---|---|---|
| P1 | Elegibilidade do comunique-se: hoje "sempre elegível", regra **provisória** | [lib/bi-elegibilidade.ts](../../lib/bi-elegibilidade.ts) |
| P2 | Agendador externo do `POST /api/internal/teams-sync` não definido | [05-implantacao.md](05-implantacao.md#tarefa-agendada-obrigatória) |
| P3 | A presença no Teams só sincroniza manualmente (botão) | [teams-e-presenca.md](08-regras-de-negocio/teams-e-presenca.md#presença-e-resultado) |
| P4 | O e-mail com o link de redefinição de senha do munícipe não é enviado por este código | [lib/municipes-auth-core.ts](../../lib/municipes-auth-core.ts) |
| P5 | Divergências entre o `example.env` e o código (variáveis ausentes, `MAIL_*` sem uso, nomes das tabelas do BI) | [03-configuracao-ambiente.md](03-configuracao-ambiente.md#divergências-entre-exampleenv-e-o-código) |
| P6 | O `basePath` está fixo em `/agendamento` e ignora `NEXT_PUBLIC_BASE_PATH` | [next.config.ts](../../next.config.ts) |
| P7 | Sem seed nem procedimento documentado para o primeiro administrador | [04-execucao-local.md](04-execucao-local.md#5-primeiro-usuário) |
| P8 | Sem script `test` nem CI | [10-testes-e-qualidade.md](10-testes-e-qualidade.md) |
| P9 | Fluxo Arthur Saboya e chat dependem do NestJS, que será descontinuado | [12-migracao-nestjs.md](12-migracao-nestjs.md) |
| P10 | Ambiente de produção, proxy, backup e monitoramento não documentados | [05-implantacao.md](05-implantacao.md#ambiente-de-produção) |
| P11 | Prazo de 5 dias úteis (pré-projetos) e antecedência recomendada de 15 min aparecem só como texto de tela, sem controle no sistema | [pre-projetos/page.tsx](../../app/_portal/pre-projetos/page.tsx), [app/_portal/page.tsx](../../app/_portal/page.tsx) |
| P12 | Não há cadastro de técnicos reserva; a escolha é manual | [agenda-tecnicos-ausencias-reserva.md](08-regras-de-negocio/agenda-tecnicos-ausencias-reserva.md#técnico-reserva) |
| P13 | O README da raiz é o modelo genérico "Base de desenvolvimento Frontend" | [README.md](../../README.md) |
| P14 | Nenhuma tela informa local, sala e orientações nem confirma (`AGENDADO`) atendimentos presenciais; também não há tela para remarcar livremente, cancelar pelo status, criar agendamento avulso ou usar `excluir` | [ciclo-de-vida-agendamento.md](08-regras-de-negocio/ciclo-de-vida-agendamento.md#ações-disponíveis-nas-telas) |
| P15 | O formulário de usuários oferece a PF/COORD perfis que o servidor recusa (Diretor, perfis Arthur Saboya) | [form-usuario.tsx](../../app/(rotas-auth)/usuarios/_components/form-usuario.tsx) |
| P17 | Na tela do chamado Arthur Saboya, `ADM_ARTHUR_SABOYA` não recebe as ações da equipe da sala; o código compara com `TEC_AS`, valor inexistente no enum; as funções de rótulo e permissão de encerramento de [lib/arthur-saboya-perfis.ts](../../lib/arthur-saboya-perfis.ts) não são usadas | [arthur-saboya-pre-projetos.md](08-regras-de-negocio/arthur-saboya-pre-projetos.md#papéis-na-tela-do-chamado) |
| P16 | PF/COORD podem criar motivos (Server Action), mas o menu Motivos só aparece para ADM/DEV | [nav-main.tsx](../../components/sidebar/nav-main.tsx) |
