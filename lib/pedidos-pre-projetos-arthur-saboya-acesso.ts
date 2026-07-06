/** @format */

import type { IUsuario } from "@/types/usuario";

/**
 * Quem pode ver a tela interna de pedidos de pré-projetos.
 * - TEC: pode acessar (a listagem é filtrada por atribuição no fluxo).
 * - ARTHUR_SABOYA (TEC_AS): acesso total aos pedidos da Sala Arthur Saboya.
 * - COORDENADOR/PONTO_FOCAL: acesso com filtro por coordenadoria.
 * - ADM/DEV: acesso total.
 */
export function usuarioPodeAcessarPedidosPreProjetosArthurSaboya(
  usuario: IUsuario | null,
): boolean {
  if (!usuario?.permissao) return false;
  const p = String(usuario.permissao);
  if (p === "DEV" || p === "ADM") return true;
  if (p === "TEC" || p === "ARTHUR_SABOYA" || p === "TEC_AS") return true;
  if (p === "COORDENADOR") return true;
  if (p === "PONTO_FOCAL") return true;
  return false;
}
