import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { validaUsuario } from "@/services/usuarios"
import { usuarioPodeAcessarConferenciaCap } from "@/lib/conferencia-cap-acesso"
import { ListaConferenciaCap } from "./_components/lista-conferencia-cap"
import type { IUsuario } from "@/types/usuario"

export default async function ConferenciaCapPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const { ok, data: usuario } = await validaUsuario()
  const usuarioLogado =
    usuario && typeof usuario === "object" && "permissao" in usuario && "id" in usuario
      ? (usuario as IUsuario)
      : null
  if (!ok || !usuarioLogado || !usuarioPodeAcessarConferenciaCap(usuarioLogado)) {
    redirect("/")
  }

  return <ListaConferenciaCap />
}
