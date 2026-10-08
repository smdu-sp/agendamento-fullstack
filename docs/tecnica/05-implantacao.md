# 5. Implantação

## Imagem Docker

[Dockerfile](../../Dockerfile) em três estágios sobre `node:22-alpine` (imagem base configurável por `ARG BASE_IMAGE`):

1. **deps** — `npm ci` (roda o `postinstall`, que gera os clients Prisma);
2. **builder** — `npm run build` com `NODE_ENV=production`. Recebe `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_BASE_PATH` como `ARG`, pois variáveis `NEXT_PUBLIC_*` são embutidas no build;
3. **runner** — copia `node_modules`, `.next`, `public`, `prisma`, `server.ts` e as configurações, e executa `npm run start` (`tsx server.ts`) na porta 3001.

O modo `output: "standalone"` **não** é usado porque é incompatível com o custom server ([ADR 0002](adr/0002-custom-server-socketio.md)).

O schema Prisma declara `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` para rodar no Alpine.

## Docker Compose

[docker-compose.yml](../../docker-compose.yml):

| Serviço | Descrição |
|---|---|
| `db` | MySQL 8.4, volume `mysql-data`, healthcheck com `mysqladmin ping` |
| `app` | Build local, porta `3001`, `env_file: .env`, `DATABASE_URL` vinda de `DATABASE_URL_DOCKER`. Aguarda o `db` saudável e executa `npx prisma migrate deploy && npm run start` |

```bash
docker compose up --build
```

As credenciais padrão do Compose são apenas para desenvolvimento.

## Migrações

Sempre aplique com `prisma migrate deploy` (o Compose já faz isso na subida). Histórico em [prisma/migrations](../../prisma/migrations/) — ver [06-banco-de-dados.md](06-banco-de-dados.md#migrações).

## URL e proxy

- A aplicação responde sob **`/agendamento`** (`basePath` fixo em [next.config.ts](../../next.config.ts)). O proxy reverso deve encaminhar esse prefixo sem removê-lo.
- O NextAuth usa `trustHost: true`, então o host da requisição define as URLs de retorno. Configure `AUTH_URL` só se precisar forçar uma URL.
- O Socket.IO compartilha a porta HTTP. O proxy precisa permitir upgrade para WebSocket.
- `FRONTEND_URL` deve apontar para a URL pública, usada nos links de e-mail.

## Tarefa agendada obrigatória

> **Pendente de confirmação.**

A fila de sincronização do Teams só é processada quando alguém chama:

```
POST /agendamento/api/internal/teams-sync
Authorization: Bearer <TEAMS_SYNC_SECRET>
```

Cada chamada processa até 20 agendamentos pendentes ([route.ts](../../app/api/internal/teams-sync/route.ts)). **O repositório não contém o agendador.** Defina um cron externo (sugestão: a cada 5 minutos) e o `TEAMS_SYNC_SECRET` no ambiente.

## Checklist de implantação

- [ ] `.env` de produção com segredos próprios (`AUTH_SECRET`, `JWT_SECRET`, `RT_SECRET`, `TEAMS_SYNC_SECRET`)
- [ ] `ENVIRONMENT` **diferente** de `local`
- [ ] `DATABASE_URL`, `BI_DATABASE_URL` e `SGU_DATABASE_URL` com rede liberada
- [ ] LDAP acessível a partir do container
- [ ] Aplicação Azure com permissões e Application Access Policy na caixa organizadora
- [ ] Caixa organizadora configurada em **Configurações** e testada com "Testar Graph"
- [ ] Cron do `teams-sync` ativo
- [ ] Proxy com `/agendamento` e suporte a WebSocket
- [ ] Backup do volume/banco MySQL (pendente de confirmação: não definido no repositório)

## Ambiente de produção

> **Pendente de confirmação.**

Servidor, orquestração, domínio público, CI/CD e política de backup não estão descritos no repositório. Completar esta seção com a equipe de infraestrutura.
