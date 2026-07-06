/** @format */

import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { IPermissao } from "@/types/usuario";
import * as agendamento from "@/services/agendamentos";
import { IAgendamento } from "@/types/agendamento";
import { AppPageShell } from "@/components/layout/app-page-shell";
import ImportarPlanilha from "./_components/importar-planilha";
import ListaAgendamentos from "./_components/lista-agendamentos";

function hojeStr(): string {
  const d = new Date();
  const s = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${s(d.getMonth() + 1)}-${s(d.getDate())}`;
}

export default async function HomeSuspense({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return Home({ searchParams });
}

async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const permissao = session.usuario?.permissao;
  const isUsr = permissao as unknown as IPermissao === IPermissao.USR || permissao === "USR";
  if (isUsr) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-xl text-muted-foreground text-center">
          Você não tem permissão para visualizar conteúdo.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  /** Só paginação/“total” na URL não devem zerar o filtro de data padrão (hoje). */
  const chavesQueNaoResetamData = new Set(["pagina", "limite", "total"]);
  const temParametroRelevante = Object.keys(sp).some(
    (k) => !chavesQueNaoResetamData.has(k),
  );
  const rawTodasDatas = sp.todasDatas;
  const todasDatas =
    rawTodasDatas === "1" ||
    rawTodasDatas === "true" ||
    (Array.isArray(rawTodasDatas) &&
      (rawTodasDatas[0] === "1" || rawTodasDatas[0] === "true"));

  const pagina = Number(sp.pagina) || 1;
  const limite = Number(sp.limite) || 10;
  const busca = (sp.busca as string) ?? "";
  const status = (sp.status as string) ?? "";
  const tipoProcesso = (sp.tipoProcesso as string) ?? "";

  const rawInicio = (sp.dataInicio as string) || "";
  const rawFim = (sp.dataFim as string) || "";
  let dataInicio: string;
  let dataFim: string;
  if (rawInicio && rawFim) {
    dataInicio = rawInicio;
    dataFim = rawFim;
  } else if (todasDatas) {
    dataInicio = "";
    dataFim = "";
  } else if (temParametroRelevante) {
    dataInicio = rawInicio;
    dataFim = rawFim;
  } else {
    dataInicio = hojeStr();
    dataFim = hojeStr();
  }

  let dados: IAgendamento[] = [];
  let total = 0;

  let ultimaImportacao: { dataHora: string; total: number } | null = null;
  if (session.access_token) {
    const response = await agendamento.buscarTudo(
      pagina,
      limite,
      busca,
      status,
      dataInicio,
      dataFim,
      "",
      "",
      tipoProcesso,
    );
    if (response.ok && response.data && "data" in response.data) {
      dados = response.data.data ?? [];
      total = response.data.total ?? 0;
    }
    const resUltima = await agendamento.getUltimaImportacaoPlanilha();
    if (resUltima.ok && resUltima.data) ultimaImportacao = resUltima.data;
  }

  let titulo = "Agendamentos";
  if (permissao as unknown as IPermissao === IPermissao.TEC) {
    titulo = "Meus Agendamentos";
  } else if (
    permissao as unknown as IPermissao === IPermissao.PONTO_FOCAL ||
    permissao as unknown as IPermissao === IPermissao.COORDENADOR
  ) {
    titulo = "Agendamentos da Coordenadoria";
  }

  return (
    <AppPageShell
      title={titulo}
      breadcrumbs={[{ label: "Agendamentos" }]}
      hidePageTitle
      actions={
        (session.usuario?.permissao as unknown as IPermissao === IPermissao.ADM ||
          session.usuario?.permissao as unknown as IPermissao === IPermissao.DEV) && (
          <ImportarPlanilha />
        )
      }
    >
      <ListaAgendamentos
        dados={dados}
        total={total}
        pagina={pagina}
        limite={limite}
        busca={busca}
        status={status}
        dataInicio={dataInicio}
        dataFim={dataFim}
        ultimaImportacao={ultimaImportacao}
      />
    </AppPageShell>
  );
}
