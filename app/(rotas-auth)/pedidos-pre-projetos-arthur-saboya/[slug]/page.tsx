/** @format */

import dynamic from "next/dynamic";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { validaUsuario } from "@/services/usuarios";
import { usuarioPodeAcessarPedidosPreProjetosArthurSaboya } from "@/lib/pedidos-pre-projetos-arthur-saboya-acesso";
import type { IUsuario } from "@/types/usuario";

const ChamadoPreProjetoPortalView = dynamic(
  () => import("../_components/chamado-pre-projeto-portal-view"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Carregando chamado…
      </div>
    ),
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = decodeURIComponent(slug || "").trim() || "Chamado";
  return {
    title: `Arthur Saboya — ${p}`,
    description: "Detalhe e andamentos do chamado de pré-projetos Arthur Saboya.",
  };
}

export default async function ChamadoPreProjetoArthurSaboyaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const { slug } = await params;
  const referenciaChamado = decodeURIComponent(slug || "").trim();

  return <ChamadoPreProjetoPortalView referenciaChamado={referenciaChamado} />;
}
