# ADR 0002 — Custom server com Socket.IO

- **Status**: vigente
- **Data do registro**: 07/10/2026

## Contexto

O chat dos chamados de pré-projetos precisa de atualização em tempo real, que hoje vem do backend NestJS. Com a descontinuação do NestJS, o próprio app precisa oferecer WebSocket.

## Decisão

A aplicação sobe por um **custom server** ([server.ts](../../../server.ts)): um servidor `http` do Node que atende o Next.js e um servidor **Socket.IO** na mesma porta (3001). CORS vem de `CORS_ORIGIN`.

## Consequências

- `output: "standalone"` não pode ser usado ([next.config.ts](../../../next.config.ts)). A imagem Docker copia o `node_modules` inteiro e roda `tsx server.ts` ([Dockerfile](../../../Dockerfile)).
- `npm run dev` e `npm run start` usam `tsx` em vez de `next dev`/`next start`.
- O proxy reverso precisa aceitar upgrade para WebSocket.
- Hoje o servidor Socket.IO só aceita conexões; os eventos do chat ainda serão implementados ([12-migracao-nestjs.md](../12-migracao-nestjs.md)).
- Com mais de uma instância seria preciso um adapter (ex.: Redis) para os eventos chegarem a todos os clientes (pendente de confirmação).
