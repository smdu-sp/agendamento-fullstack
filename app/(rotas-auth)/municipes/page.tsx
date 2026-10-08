/** @format */

import DataTable from "@/components/data-table";
import { Filtros } from "@/components/filtros";
import Pagination from "@/components/pagination";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { getSessionUsuario, verificarPermissoes } from "@/lib/authz";
import * as municipe from "@/services/municipes";
import { IMunicipe, IPaginadoMunicipe } from "@/types/municipe";
import { redirect } from "next/navigation";
import { columns } from "./_components/columns";

export default async function Municipes({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const logado = await getSessionUsuario();
  if (!logado) redirect("/login");
  try {
    verificarPermissoes(logado, ["ADM", "DEV"]);
  } catch {
    redirect("/");
  }

  let { pagina = 1, limite = 10, total = 0 } = await searchParams;
  const { busca = "", status = "" } = await searchParams;
  let dados: IMunicipe[] = [];

  const response = await municipe.buscarTudo(
    +pagina,
    +limite,
    busca as string,
    status as string,
  );
  if (response.ok && response.data) {
    const paginado = response.data as IPaginadoMunicipe;
    pagina = paginado.pagina || 1;
    limite = paginado.limite || 10;
    total = paginado.total || 0;
    dados = paginado.data || [];
  }

  const statusSelect = [
    { label: "Ativo", value: "ATIVO" },
    { label: "Inativo", value: "INATIVO" },
  ];

  return (
    <AppPageShell title="Munícipes" breadcrumbs={[{ label: "Munícipes" }]}>
      <div className="relative flex w-full flex-col gap-3 pb-20">
        <Filtros
          camposFiltraveis={[
            {
              nome: "Busca",
              tag: "busca",
              tipo: 0,
              placeholder: "Digite o nome ou e-mail",
            },
            {
              nome: "Status",
              tag: "status",
              tipo: 2,
              valores: statusSelect,
            },
          ]}
        />
        {!response.ok && (
          <p className="text-sm text-destructive">{response.error}</p>
        )}
        <DataTable columns={columns} data={dados} />

        {dados.length > 0 && (
          <Pagination total={+total} pagina={+pagina} limite={+limite} />
        )}
      </div>
    </AppPageShell>
  );
}
