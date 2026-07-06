/** @format */

"use client";

import { AppPageShell } from "@/components/layout/app-page-shell";
import ListaPedidosPreProjetos from "./lista-pedidos-pre-projetos";

const LISTA_PATH = "/pedidos-pre-projetos-arthur-saboya";

export function ListaPedidosArthurSaboyaShell() {
  return (
    <AppPageShell
      title="Pedidos de pré-projetos"
      breadcrumbs={[
        { label: "Sala Arthur Saboya", href: LISTA_PATH },
        { label: "Pedidos de pré-projetos" },
      ]}
    >
      <ListaPedidosPreProjetos />
    </AppPageShell>
  );
}
