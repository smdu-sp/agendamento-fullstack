# 4. Execução local

## Pré-requisitos

- Node.js 22 (mesma versão da imagem Docker — [Dockerfile](../../Dockerfile))
- Docker (opcional, para subir o MySQL)
- Acesso de rede ao LDAP, BI, SGU e Microsoft Graph, se for testar essas integrações

## 1. Instalar dependências

```bash
npm install
```

O `postinstall` gera os dois clients do Prisma: o principal e o do SGU (`prisma generate --schema=prisma/sgu/schema.prisma`).

## 2. Configurar o `.env`

```bash
cp example.env .env      # Windows: copy example.env .env
```

Gere segredos aleatórios para `AUTH_SECRET`, `JWT_SECRET` e `RT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Preencha as demais variáveis conforme [03-configuracao-ambiente.md](03-configuracao-ambiente.md). Para desenvolver sem acesso ao AD, use `ENVIRONMENT=local` (o LDAP é ignorado; **nunca use em produção**).

## 3. Subir o banco

Só o MySQL no Docker, com a aplicação rodando na máquina:

```bash
docker compose up -d --wait db
npm run prisma:migrate:deploy
```

Ajuste `DATABASE_URL` para `localhost` na porta `MYSQL_PORT`, com usuário, senha e banco iguais aos `MYSQL_*`.

Comandos úteis:

| Ação | Comando |
|---|---|
| Ver estado | `docker compose ps db` |
| Parar mantendo dados | `docker compose stop db` |
| Remover **incluindo dados** | `docker compose down -v` |

## 4. Rodar a aplicação

```bash
npm run dev     # tsx watch server.ts (recarrega ao salvar)
```

Acesse `http://localhost:3001/agendamento`.

- Área interna: `/agendamento/login`
- Portal do munícipe: `/agendamento/portal`

## 5. Primeiro usuário ❓

O repositório não tem seed. O login de servidores exige que o usuário exista na tabela `usuarios` (o LDAP só valida a senha). Para o primeiro acesso, insira manualmente um usuário com `permissao = 'ADM'` ou `'DEV'` e o login de rede correspondente. Para usuários com login local (ex.: Portaria), preencha `senha` com um hash bcrypt.

## 6. Criar migrações (desenvolvimento)

```bash
npm run prisma:migrate:dev -- --name descricao_da_mudanca
```

## 7. Lint e testes

```bash
npm run lint
npx tsx --test tests/*.test.ts    # ❓ não há script "test" no package.json
```

Ver [10-testes-e-qualidade.md](10-testes-e-qualidade.md).

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Login sempre falha | Usuário inexistente/inativo em `usuarios`, LDAP inacessível, ou `ENVIRONMENT` diferente de `local` sem rede para o AD |
| Aviso `[prismaSgu] Banco SGU inacessível` | SGU fora do ar. O app continua funcionando, mas não infere a divisão dos técnicos |
| Portal informa "Não foi possível consultar o BI" | `BI_DATABASE_URL` ausente, incompleta ou sem rede |
| Reuniões não são criadas | Credenciais Azure ausentes ou e-mail organizador não configurado. Ver campo `teamsUltimoErro` do agendamento |
| Telas de Arthur Saboya vazias | Backend NestJS não configurado (`NEXT_PUBLIC_API_URL`) |
