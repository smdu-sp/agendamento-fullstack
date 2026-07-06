/** @format */

import { ChevronsUpDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/auth";
import { IPermissao } from "@/types/usuario";
import Link from "next/link";
import BtnSignOut from "../btn-signout";
// import { useRouter } from "next/navigation";

export async function NavUser() {
  // const { isMobile } = useSidebar();
  // const router = useRouter();
  const session = await auth();

  function abreviaNome(nome: string): string {
    const nomes = nome.split(" ");
    return `${nomes[0].substring(0, 1)}${nomes[nomes.length - 1].substring(
      0,
      1,
    )}`;
  }

  function reduzNome(nome: string): string {
    if (nome.length <= 20) {
      return nome;
    }
    const nomes = nome.split(" ");
    return `${nomes[0]} ${nomes[nomes.length - 1]}`;
  }

  function obterPermissaoInfo(permissao: IPermissao | string): {
    texto: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success";
  } {
    // Se for string, tenta mapear
    if (typeof permissao === "string") {
      const permissaoUpper = permissao.toUpperCase();
      if (permissaoUpper === "DEV") {
        return { texto: "Desenvolvedor", variant: "default" };
      }
      if (permissaoUpper === "TEC") {
        return { texto: "Técnico", variant: "default" };
      }
      if (permissaoUpper === "ADM") {
        return { texto: "Administrador", variant: "destructive" };
      }
      if (permissaoUpper === "USR") {
        return { texto: "Usuário", variant: "secondary" };
      }
      if (permissaoUpper === "PONTO_FOCAL") {
        return { texto: "Ponto Focal", variant: "success" };
      }
      if (permissaoUpper === "COORDENADOR") {
        return { texto: "Coordenador", variant: "success" };
      }
      if (permissaoUpper === "PORTARIA") {
        return { texto: "Portaria", variant: "secondary" };
      }
      if (permissaoUpper === "DIRETOR") {
        return { texto: "Diretor", variant: "outline" };
      }
      return { texto: "Portaria", variant: "secondary" };
    }

    // Se for enum, converte para string legível
    const permissoes: Record<
      IPermissao,
      {
        texto: string;
        variant:
          | "default"
          | "secondary"
          | "destructive"
          | "outline"
          | "success";
      }
    > = {
      [IPermissao.DEV]: { texto: "Desenvolvedor", variant: "default" },
      [IPermissao.TEC]: { texto: "Técnico", variant: "default" },
      [IPermissao.ADM]: { texto: "Administrador", variant: "destructive" },
      [IPermissao.USR]: { texto: "Usuário", variant: "secondary" },
      [IPermissao.PONTO_FOCAL]: { texto: "Ponto Focal", variant: "success" },
      [IPermissao.COORDENADOR]: { texto: "Coordenador", variant: "success" },
      [IPermissao.PORTARIA]: { texto: "Portaria", variant: "secondary" },
      [IPermissao.DIRETOR]: { texto: "Diretor", variant: "outline" },
    };

    return permissoes[permissao] || { texto: "Portaria", variant: "secondary" };
  }

  return (
    session &&
    session.usuario && (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent cursor-pointer data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-full aspect-square">
                  <AvatarImage src={session.usuario.avatar} />
                  <AvatarFallback className="rounded-full">
                    {abreviaNome(
                      session.usuario.nomeSocial || session.usuario.nome,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {reduzNome(
                      session.usuario.nomeSocial || session.usuario.nome,
                    )}
                  </span>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        obterPermissaoInfo(session.usuario.permissao).variant
                      }
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {obterPermissaoInfo(session.usuario.permissao).texto}
                    </Badge>
                  </div>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuItem asChild className="p-1 font-normal">
                <Link href="perfil">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage src={session.usuario.avatar} />
                      <AvatarFallback className="rounded-full">
                        {abreviaNome(
                          session.usuario.nomeSocial || session.usuario.nome,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {reduzNome(
                          session.usuario.nomeSocial || session.usuario.nome,
                        )}
                      </span>
                      <div className="mt-0.5">
                        <Badge
                          variant={
                            obterPermissaoInfo(session.usuario.permissao)
                              .variant
                          }
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {obterPermissaoInfo(session.usuario.permissao).texto}
                        </Badge>
                      </div>
                      <span className="truncate text-xs text-muted-foreground mt-1">
                        {session.usuario.email}
                      </span>
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <BtnSignOut />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  );
}
