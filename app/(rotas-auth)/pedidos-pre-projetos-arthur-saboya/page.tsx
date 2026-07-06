/** @format */

import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { validaUsuario } from "@/services/usuarios";
import { usuarioPodeAcessarPedidosPreProjetosArthurSaboya } from "@/lib/pedidos-pre-projetos-arthur-saboya-acesso";
import { ListaPedidosArthurSaboyaShell } from "./_components/lista-pedidos-arthur-saboya-shell";
import type { IUsuario } from "@/types/usuario";

export default async function PedidosPreProjetosArthurSaboyaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { ok, data: usuario } = await validaUsuario();
  const usuarioLogado =
    usuario &&
    typeof usuario === "object" &&
    "permissao" in usuario &&
    "id" in usuario
      ? (usuario as IUsuario)
      : null;
  if (
    !ok ||
    !usuarioLogado ||
    !usuarioPodeAcessarPedidosPreProjetosArthurSaboya(usuarioLogado)
  ) {
    redirect("/");
  }

  return <ListaPedidosArthurSaboyaShell />;
}
