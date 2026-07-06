/** @format */

const SEG = "pedidos-pre-projetos-arthur-saboya";

/** Lista ou detalhe: primeira rota sob `/pedidos-pre-projetos-arthur-saboya`. */
export function isPedidosPreProjetosArthurSaboyaAreaPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === SEG;
}

/** Detalhe de chamado: `/…/pedidos-pre-projetos-arthur-saboya/<slug>` (ex.: protocolo). */
export function isChamadoArthurSaboyaDetalhePath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf(SEG);
  return i !== -1 && Boolean(parts[i + 1]);
}
