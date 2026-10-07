# 10. Testes e qualidade

## Testes automatizados ✅

Testes unitários com o executor nativo do Node (`node:test` + `node:assert/strict`):

| Arquivo | Cobre |
|---|---|
| [tests/agenda-slots.test.ts](../../tests/agenda-slots.test.ts) | Geração de slots, sobreposição, validação de regras ([lib/agenda-slots.ts](../../lib/agenda-slots.ts)) |
| [tests/agendamento-transicoes.test.ts](../../tests/agendamento-transicoes.test.ts) | Máquina de estados ([lib/agendamento-transicoes.ts](../../lib/agendamento-transicoes.ts)) |
| [tests/bi-elegibilidade.test.ts](../../tests/bi-elegibilidade.test.ts) | Elegibilidade de comunique-se e despacho ([lib/bi-elegibilidade.ts](../../lib/bi-elegibilidade.ts)) |

### Como executar ❓

Não há script `test` no [package.json](../../package.json). Como os testes são TypeScript e o projeto já tem `tsx`:

```bash
npx tsx --test tests/*.test.ts
```

Sugestão: adicionar `"test": "tsx --test tests/*.test.ts"` ao `package.json`.

## Lacunas de cobertura

Sem testes automatizados:

- autorização e escopos por perfil ([lib/authz.ts](../../lib/authz.ts), listagens);
- criação pelo portal, roteamento pelo BI e técnico reserva;
- conferência CAP;
- importação de planilhas;
- fila de sincronização e presença do Teams;
- autenticação do munícipe e redefinição de senha.

## Análise estática ✅

- ESLint 9 com `eslint-config-next` ([eslint.config.mjs](../../eslint.config.mjs)): `npm run lint`.
- TypeScript em modo `strict` ([tsconfig.json](../../tsconfig.json)).

## CI ❓

Não há pipeline de integração contínua no repositório.
