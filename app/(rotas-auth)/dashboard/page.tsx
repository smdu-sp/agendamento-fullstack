/** @format */

import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/layout/app-page-shell";
import DashboardContent from "./_components/dashboard-content";

export const metadata = {
  title: "Dashboard | Agendamentos",
  description:
    "Indicadores de agendamentos por mês, ano, realizados e não realizados.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const permissao = String(session.usuario?.permissao ?? "");
  const podeVerDashboard =
    permissao === "ADM" ||
    permissao === "DEV" ||
    permissao === "PONTO_FOCAL" ||
    permissao === "COORDENADOR" ||
    permissao === "DIRETOR";

  if (!podeVerDashboard) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-xl text-muted-foreground text-center">
          Você não tem permissão para acessar o dashboard.
        </p>
      </div>
    );
  }

  return (
    <AppPageShell title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <DashboardContent />
    </AppPageShell>
  );
}
