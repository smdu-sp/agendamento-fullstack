# 12. Migração do backend NestJS

**Decisão**: o backend NestJS será descontinuado na versão fullstack. Todo o domínio passa a ser atendido por este repositório (Server Actions, route handlers e o Socket.IO do [server.ts](../../server.ts)).

## Já migrado ✅

Os comentários "Porta de ..." no código indicam que já foram migrados:

- autenticação de servidores, refresh e guards ([lib/auth-core.ts](../../lib/auth-core.ts), [lib/authz.ts](../../lib/authz.ts));
- autenticação do munícipe ([lib/municipes-auth-core.ts](../../lib/municipes-auth-core.ts));
- agendamentos: CRUD, listagem, dashboard, importações e Teams ([services/agendamentos](../../services/agendamentos/), [lib/agendamentos-core.ts](../../lib/agendamentos-core.ts));
- usuários, coordenadorias, divisões, tipos, motivos e configurações;
- portal de processos, CAP e agenda dos técnicos (já nasceram no Next.js).

## Ainda dependente do NestJS

As chamadas usam `getApiUrl()` ([lib/api-url.ts](../../lib/api-url.ts)), ou seja, `INTERNAL_API_URL` no servidor e `NEXT_PUBLIC_API_URL` no navegador.

| Funcionalidade | Rota NestJS | Arquivo cliente |
|---|---|---|
| Envio público de pré-projeto | `agendamentos/publico/pre-projetos` | [app/_portal/pre-projetos/page.tsx](../../app/_portal/pre-projetos/page.tsx) |
| Chamados do munícipe: lista, detalhe, mensagens, marcar solucionado, avaliação, cancelar atendimento | `agendamentos/municipes/pre-projetos-chamados/...` | [municipe-pre-projetos-chamados.ts](../../services/agendamentos/query-functions/municipe-pre-projetos-chamados.ts) |
| Pedidos (equipe): lista | `agendamentos/solicitacoes-pre-projetos/arthur-saboya/portal/buscar-tudo` | [buscar-solicitacoes-portal-arthur-saboya.ts](../../services/agendamentos/query-functions/buscar-solicitacoes-portal-arthur-saboya.ts) |
| Pedidos (equipe): detalhe e mensagens | `.../portal/{protocolo}`, `.../mensagens` | [portal-arthur-saboya-chamado-detalhe.ts](../../services/agendamentos/query-functions/portal-arthur-saboya-chamado-detalhe.ts) |
| Pedidos (equipe): confirmar resposta, aguardando data, criar agendamento, atribuir técnico da coordenadoria | `.../confirmar-resposta-enviada`, `/marcar-aguardando-data`, `/criar-agendamento`, `/atribuir-tecnico-coordenadoria` | [portal-arthur-saboya-solicitacoes-mutacoes.ts](../../services/agendamentos/query-functions/portal-arthur-saboya-solicitacoes-mutacoes.ts) |
| Chat em tempo real | Socket.IO: `preprojeto:join`, `preprojeto:atualizado` | [lib/pre-projeto-chat-realtime.ts](../../lib/pre-projeto-chat-realtime.ts) |
| Envio de teste do preview de e-mails (DEV) | `POST email/preview-send` | [services/email/client-functions/preview-send.ts](../../services/email/client-functions/preview-send.ts) |

Observação: os arquivos de mutação ficam em `query-functions` e têm nomes de leitura, o que destoa da convenção do projeto. Reorganizar na migração.

## O que fazer para concluir

1. Portar para Server Actions as operações listadas, reaproveitando as tabelas `solicitacoes_pre_projeto_arthur_saboya*`, que já existem no schema.
2. Implementar os eventos `preprojeto:join` e `preprojeto:atualizado` no Socket.IO do [server.ts](../../server.ts) (comentário "Fase 6") e apontar [lib/pre-projeto-chat-realtime.ts](../../lib/pre-projeto-chat-realtime.ts) para o próprio app.
3. Definir como os e-mails que o NestJS enviava serão enviados (provavelmente pelo Graph `Mail.Send`, já usado nos avisos do Teams). Inclui o link de redefinição de senha do munícipe ❓.
4. Remover as variáveis `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_AGENDAMENTOS_API_URL` e, se não forem mais usadas, `MAIL_*`; remover `getApiUrl` de [lib/api-url.ts](../../lib/api-url.ts) e `getAuthHeaders` de [lib/api-headers.ts](../../lib/api-headers.ts) (cabeçalho `X-Impersonate-Permissao`, usado só pelo backend). Manter `setImpersonatePermissaoStorage`, que grava o cookie de personificação lido por [lib/authz.ts](../../lib/authz.ts).
5. Atualizar esta documentação: [arthur-saboya-pre-projetos.md](08-regras-de-negocio/arthur-saboya-pre-projetos.md), [09-apis-e-integracoes.md](09-apis-e-integracoes.md) e [03-configuracao-ambiente.md](03-configuracao-ambiente.md).

Planejamento anterior da migração: `MAPEAMENTO_FLUXO_ATUAL_AGENDAMENTOS.md` e `PLANO_ALTERACOES_PORTAL_AGENDAMENTOS.md` ([histórico](historico/README.md)).
