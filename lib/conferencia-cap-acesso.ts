import "server-only";

import type { IUsuario } from "@/types/usuario";
import { SIGLA_COORDENADORIA_CAP } from "@/lib/portal-processos-constantes";

export function usuarioPodeAcessarConferenciaCap(
	usuario: { permissao?: string | null; divisao?: IUsuario["divisao"] } | IUsuario | null,
): boolean {
	if (!usuario?.permissao) return false;
	const p = String(usuario.permissao);
	if (p === "DEV" || p === "ADM") return true;
	if (p !== "PONTO_FOCAL" && p !== "COORDENADOR") return false;
	const sigla = usuario.divisao?.coordenadoria?.sigla?.trim().toUpperCase();
	return sigla === SIGLA_COORDENADORIA_CAP;
}
