import assert from "node:assert/strict";
import test from "node:test";
import { elegivelComuniqueSe, elegivelDespacho } from "../lib/bi-elegibilidade";

test("comunique-se permite qualquer situação nesta versão", () => {
	for (const situacao of [null, "", "CONCLUÍDO", "Fechado", "Pendente"]) {
		assert.equal(elegivelComuniqueSe(situacao), true);
	}
});

test("despacho permite somente a situação INDEFERIDO normalizada", () => {
	for (const situacao of ["INDEFERIDO", " indeferido ", "Indeferido"]) {
		assert.equal(elegivelDespacho(situacao), true);
	}
	for (const situacao of [null, "", "DEFERIDO", "INDEFERIDO PARCIAL", "INDEFERIR"]) {
		assert.equal(elegivelDespacho(situacao), false);
	}
});
