/** @format */

import DataTable from "@/components/data-table";
import { Filtros } from "@/components/filtros";
import Pagination from "@/components/pagination";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { auth } from "@/lib/auth/auth";
import * as usuario from "@/services/usuarios";
import { IPaginadoUsuario, IUsuario } from "@/types/usuario";
import { columns } from "./_components/columns";
import ModalUpdateAndCreate from "./_components/modal-update-create";

export default async function UsuariosSuspense({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return Usuarios({ searchParams });
}

async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let { pagina = 1, limite = 10, total = 0 } = await searchParams;
  let ok = false;
  const { busca = "", status = "", permissao = "" } = await searchParams;
  let dados: IUsuario[] = [];

  const session = await auth();
  // USR não tem permissão para ver usuários
  const isUsr =
    session?.usuario?.permissao === "USR" ||
    (typeof session?.usuario?.permissao === "number" &&
      String(session?.usuario?.permissao) === "3"); // IPermissao.USR
  if (isUsr) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }
  if (session && session.access_token) {
    const response = await usuario.buscarTudo(
      +pagina,
      +limite,
      busca as string,
      status as string,
      permissao as string,
    );
    const { data } = response;
    ok = response.ok;
    if (ok) {
      if (data) {
        const paginado = data as IPaginadoUsuario;
        pagina = paginado.pagina || 1;
        limite = paginado.limite || 10;
        total = paginado.total || 0;
        dados = paginado.data || [];
      }
      const paginado = data as IPaginadoUsuario;
      dados = paginado.data || [];
    }
  }

  const statusSelect = [
    {
      label: "Ativo",
      value: "ATIVO",
    },
    {
      label: "Inativo",
      value: "INATIVO",
    },
  ];

  const permissaoSelect = [
    {
      label: "Desenvolvedor",
      value: "DEV",
    },
    {
      label: "Administrador",
      value: "ADM",
    },
    {
      label: "Técnico",
      value: "TEC",
    },
    {
      label: "Técnico Arthur Saboya",
      value: "ARTHUR_SABOYA",
    },
    {
      label: "Ponto Focal",
      value: "PONTO_FOCAL",
    },
    {
      label: "Coordenador",
      value: "COORDENADOR",
    },
    {
      label: "Portaria",
      value: "PORTARIA",
    },
    {
      label: "Usuário",
      value: "USR",
    },
  ];

  return (
    <AppPageShell title="Usuários" breadcrumbs={[{ label: "Usuários" }]}>
      <div className="relative flex w-full flex-col gap-3 pb-20">
        <Filtros
          camposFiltraveis={[
            {
              nome: "Busca",
              tag: "busca",
              tipo: 0,
              placeholder: "Digite o nome, email ou login",
            },
            {
              nome: "Status",
              tag: "status",
              tipo: 2,
              valores: statusSelect,
              default: "ATIVO",
            },
            {
              nome: "Permissão",
              tag: "permissao",
              tipo: 2,
              valores: permissaoSelect,
            },
          ]}
        />
        <DataTable columns={columns} data={dados || []} />

        {dados && dados.length > 0 && (
          <Pagination total={+total} pagina={+pagina} limite={+limite} />
        )}
      </div>
      <div className="absolute bottom-6 right-1 z-10 hover:scale-110 sm:right-2">
        <ModalUpdateAndCreate isUpdating={false} />
      </div>
    </AppPageShell>
  );
}
