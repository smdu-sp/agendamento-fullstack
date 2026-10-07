import assert from "node:assert/strict";
import test from "node:test";
import { StatusAgendamento as S } from "@prisma/client";
import { validarTransicaoAgendamento, statusTerminal } from "../lib/agendamento-transicoes";

test("fluxo principal e cancelamentos permitidos", () => {
  for (const [origem, destino] of [
    [S.SOLICITADO, S.AGENDADO], [S.AGENDADO, S.ATENDIDO], [S.ATENDIDO, S.CONCLUIDO],
    [S.SOLICITADO, S.CANCELADO], [S.AGENDADO, S.CANCELADO], [S.AGENDADO, S.NAO_REALIZADO],
  ] as const) assert.doesNotThrow(() => validarTransicaoAgendamento(origem, destino));
});

test("saltos e retorno de estados terminais são rejeitados", () => {
  assert.throws(() => validarTransicaoAgendamento(S.SOLICITADO, S.ATENDIDO), /não permitida/);
  assert.throws(() => validarTransicaoAgendamento(S.CONCLUIDO, S.AGENDADO), /não permitida/);
  assert.equal(statusTerminal(S.NAO_REALIZADO), true);
  assert.equal(statusTerminal(S.AGENDADO), false);
});
