/** @format */

import {
  ChevronRight,
  House,
  LucideProps,
  Users,
  Upload,
  Building2,
  Layers,
  Tags,
  ListX,
  LayoutDashboard,
  Monitor,
  FileText,
  Lightbulb,
  Search,
  HelpCircle,
  ClipboardList,
  CalendarSearch,
  Mail,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { validaUsuario } from "@/services/usuarios";
import { IUsuario } from "@/types/usuario";
import { usuarioPodeAcessarPedidosPreProjetosArthurSaboya } from "@/lib/pedidos-pre-projetos-arthur-saboya-acesso";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import Link from "../link";

export async function NavMain() {
  let usuario: IUsuario | null = null;
  const { ok, data } = await validaUsuario();
  if (ok && data) {
    usuario = data as IUsuario;
  }
  interface IMenu {
    icone: ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >;
    titulo: string;
    url?: string;
    permissao?: string;
    subItens?: ISubMenu[];
  }

  interface ISubMenu {
    titulo: string;
    url: string;
  }

  const menuUsuario: IMenu[] = [
    {
      icone: House,
      titulo: "Página Inicial",
      url: "/",
    },
    {
      icone: CalendarSearch,
      titulo: "Agendamentos",
      url: "/agendamentos",
    },
  ];

  const menuAdmin: IMenu[] = [
    {
      icone: Users,
      titulo: "Usuários",
      url: "/usuarios",
      permissao: "usuario_buscar_tudo",
    },
    {
      icone: Building2,
      titulo: "Coordenadorias",
      url: "/coordenadorias",
    },
    {
      icone: Layers,
      titulo: "Divisões",
      url: "/divisoes",
    },
    {
      icone: Tags,
      titulo: "Tipos de Agendamento",
      url: "/tipos-agendamento",
    },
    {
      icone: ListX,
      titulo: "Motivos de não atendimento",
      url: "/motivos",
    },
    {
      icone: Upload,
      titulo: "Importar Agendamentos",
      url: "/importar-planilha",
    },
    {
      icone: Upload,
      titulo: "Importar Outlook",
      url: "/importar-agendamentos-outlook",
    },
  ];

  const menuPaginasExternas: IMenu[] = [
    {
      icone: Monitor,
      titulo: "Portal Arthur Saboya",
      url: "/portal",
    },
    {
      icone: FileText,
      titulo: "Processos",
      url: "/processos",
    },
    {
      icone: Lightbulb,
      titulo: "Pré-Projetos",
      url: "/pre-projetos",
    },
    {
      icone: Search,
      titulo: "Consulta",
      url: "/consulta",
    },
    {
      icone: HelpCircle,
      titulo: "Perguntas Frequentes",
      url: "/perguntas-frequentes",
    },
  ];

  return (
    <SidebarContent>
      <SidebarGroup className="space-y-2">
        {menuUsuario && (
          <>
            <SidebarGroupLabel>Geral</SidebarGroupLabel>
            <SidebarMenu>
              {menuUsuario.map((item: IMenu) =>
                item.subItens ? (
                  <Collapsible
                    key={item.titulo}
                    asChild
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.titulo}>
                          {item.icone && <item.icone />}
                          <span>{item.titulo}</span>
                          {item.subItens && (
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {item.subItens && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItens?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.titulo}>
                                <Link href={item.url || "#"}>
                                  {item.icone && <item.icone />}
                                  <span>{item.titulo}</span>
                                </Link>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.titulo} className="z-50">
                    <Link href={item.url || "#"}>
                      {item.icone && <item.icone />}
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuItem>
                ),
              )}
              {usuario && usuarioPodeAcessarPedidosPreProjetosArthurSaboya(usuario) && (
                <SidebarMenuItem className="z-50">
                  <Link href="/pedidos-pre-projetos-arthur-saboya">
                    <ClipboardList />
                    <span>Pedidos Arthur Saboya</span>
                  </Link>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </>
        )}
        {usuario &&
          usuario.permissao &&
          ["DEV", "ADM", "PONTO_FOCAL", "COORDENADOR", "DIRETOR"].includes(
            usuario.permissao.toString(),
          ) && (
            <>
              <SidebarGroupLabel>
                {["DEV", "ADM"].includes(usuario.permissao.toString())
                  ? "Administração"
                  : usuario.permissao.toString() === "DIRETOR"
                    ? "Divisão"
                    : "Coordenadoria"}
              </SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem className="z-50">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuItem>
                {!["DIRETOR"].includes(usuario.permissao.toString()) && (
                  <SidebarMenuItem className="z-50">
                    <Link href="/usuarios">
                      <Users />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuItem>
                )}
                {["DEV", "ADM"].includes(usuario.permissao.toString()) &&
                  menuAdmin
                    .filter((item) => {
                      if (item.titulo === "Usuários") return false;
                      const podeEstrutura = ["ADM", "DEV"].includes(
                        usuario?.permissao?.toString() ?? "",
                      );
                      if (
                        !podeEstrutura &&
                        (item.titulo === "Coordenadorias" ||
                          item.titulo === "Divisões")
                      ) {
                        return false;
                      }
                      return true;
                    })
                    .map((item) =>
                      item.subItens ? (
                        <Collapsible
                          key={item.titulo}
                          asChild
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={item.titulo}>
                                {item.icone && <item.icone />}
                                <span>{item.titulo}</span>
                                {item.subItens && (
                                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            {item.subItens && (
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.subItens?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.titulo}>
                                      <Link href={item.url || "#"}>
                                        {item.icone && <item.icone />}
                                        <span>{item.titulo}</span>
                                      </Link>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </SidebarMenuItem>
                        </Collapsible>
                      ) : (
                        <SidebarMenuItem key={item.titulo} className="z-50">
                          <Link href={item.url || "#"}>
                            {item.icone && <item.icone />}
                            <span>{item.titulo}</span>
                          </Link>
                        </SidebarMenuItem>
                      ),
                    )}
              </SidebarMenu>
            </>
          )}
        {usuario?.permissao?.toString() === "DEV" && (
          <>
            <SidebarGroupLabel>Páginas Externas</SidebarGroupLabel>
            <SidebarMenu>
              {menuPaginasExternas.map((item) => (
                <SidebarMenuItem key={item.titulo} className="z-50">
                  <Link href={item.url || "#"}>
                    {item.icone && <item.icone />}
                    <span>{item.titulo}</span>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarGroupLabel>Ferramentas DEV</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem className="z-50">
                <Link href="/dev/email-preview">
                  <Mail />
                  <span>Preview de E-mails</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarGroup>
    </SidebarContent>
  );
}
