import assert from "node:assert/strict";
import test from "node:test";
import { gerarSlotsAgenda, intervalosSobrepostos, validarRegraAgenda } from "../lib/agenda-slots";

const dia = new Date("2026-09-29T00:00:00.000Z"); // terça-feira
const regra = {
  diaSemana: 2, horaInicio: "09:00", horaFim: "11:00", duracaoMinutos: 30,
  modalidade: "ONLINE" as const, vigenciaInicio: dia, vigenciaFim: null, ativo: true,
};

test("gera faixas recorrentes e remove ausências e reservas sobrepostas", () => {
  const slots = gerarSlotsAgenda({
    data: dia, modalidade: "ONLINE", regras: [regra],
    ausencias: [{ inicio: new Date("2026-09-29T09:10:00Z"), fim: new Date("2026-09-29T09:20:00Z") }],
    agendamentos: [{ inicio: new Date("2026-09-29T10:00:00Z"), fim: new Date("2026-09-29T10:30:00Z") }],
  });
  assert.deepEqual(slots.map((s) => s.inicio.toISOString().slice(11, 16)), ["09:30", "10:30"]);
});

test("limites contíguos não se sobrepõem e vigência/modalidade são respeitadas", () => {
  assert.equal(intervalosSobrepostos(
    { inicio: new Date("2026-09-29T09:00:00Z"), fim: new Date("2026-09-29T09:30:00Z") },
    { inicio: new Date("2026-09-29T09:30:00Z"), fim: new Date("2026-09-29T10:00:00Z") },
  ), false);
  assert.equal(gerarSlotsAgenda({ data: dia, modalidade: "PRESENCIAL", regras: [regra], ausencias: [], agendamentos: [] }).length, 0);
  assert.equal(gerarSlotsAgenda({ data: new Date("2026-09-30T00:00:00Z"), modalidade: "ONLINE", regras: [regra], ausencias: [], agendamentos: [] }).length, 0);
});

test("não aceita duração que excede a faixa", () => {
  assert.throws(() => validarRegraAgenda({ ...regra, duracaoMinutos: 180 }), /Duração inválida/);
});
