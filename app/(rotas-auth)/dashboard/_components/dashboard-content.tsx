"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import * as agendamentos from "@/services/agendamentos";
import type { TipoPeriodoDashboard } from "@/types/dashboard";
import * as coordenadorias from "@/services/coordenadorias";
import * as divisoes from "@/services/divisoes";
import * as usuario from "@/services/usuarios";
import { IDashboard, IDashboardPorMes } from "@/types/dashboard";
import { ICoordenadoria } from "@/types/coordenadoria";
import { IDivisao } from "@/types/divisao";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Calendar,
  XCircle,
  Loader2,
  Percent,
  UserX,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useEffectivePermissao } from "@/providers/ImpersonationProvider";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IUsuario, IUsuarioSession } from "@/types/usuario";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function getSegundaFeira(d: Date): Date {
  const d2 = new Date(d);
  const day = d2.getDay();
  const diff = d2.getDate() - day + (day === 0 ? -6 : 1);
  d2.setDate(diff);
  d2.setHours(0, 0, 0, 0);
  return d2;
}

function formatarPorMes(porMes: IDashboardPorMes[]) {
  return porMes.map((p) => ({
    mes: MESES[p.mes - 1],
    total: p.total,
    fill: "hsl(var(--chart-1))",
  }));
}

function formatarIntervaloSemana(semanaInicio: string): string {
  const seg = new Date(semanaInicio + "T12:00:00");
  const dom = new Date(seg);
  dom.setDate(dom.getDate() + 6);
  // Exibir sempre com ano completo (DD/MM/AAAA)
  return `${format(seg, "dd/MM/yyyy", { locale: ptBR })} – ${format(dom, "dd/MM/yyyy", { locale: ptBR })}`;
}

export default function DashboardContent() {
  const { data: session } = useSession();
  const effectivePermissao = useEffectivePermissao();
  const [dashboard, setDashboard] = useState<IDashboard | null>(null);
  const [coordenadoriasLista, setCoordenadoriasLista] = useState<
    ICoordenadoria[]
  >([]);
  const [coordenadoriaUsuario, setCoordenadoriaUsuario] =
    useState<ICoordenadoria | null>(null);
  const [divisoesLista, setDivisoesLista] = useState<IDivisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoDashboard>("ano");
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [semanaInicio, setSemanaInicio] = useState(() =>
    format(getSegundaFeira(new Date()), "yyyy-MM-dd"),
  );
  const [coordenadoriaId, setCoordenadoriaId] = useState<string>("");
  const [divisaoId, setDivisaoId] = useState<string>("");
  const requestIdRef = useRef(0);

  const permissao = String(effectivePermissao ?? session?.usuario?.permissao ?? "");
  const isAdmOuDev = permissao === "ADM" || permissao === "DEV";
  const isPontoFocal = permissao === "PONTO_FOCAL";
  const isCoordenador = permissao === "COORDENADOR";
  const isDiretor = permissao === "DIRETOR";
  const podeVerDashboard =
    permissao === "ADM" ||
    permissao === "DEV" ||
    permissao === "PONTO_FOCAL" ||
    permissao === "COORDENADOR" ||
    permissao === "DIRETOR";

  useEffect(() => {
    if (!podeVerDashboard) return;
    if (isAdmOuDev) {
      Promise.all([
        coordenadorias.listaCompleta(),
        divisoes.listaCompleta(),
      ]).then(([respCoord, respDiv]) => {
        if (respCoord.ok && respCoord.data && Array.isArray(respCoord.data)) {
          setCoordenadoriasLista(respCoord.data);
        }
        if (respDiv.ok && respDiv.data && Array.isArray(respDiv.data)) {
          setDivisoesLista(respDiv.data);
        }
      });
    }
  }, [isAdmOuDev, podeVerDashboard, session?.access_token]);

  // Carrega a coordenadoria vinculada ao usuário Ponto Focal / Coordenador
  useEffect(() => {
    if (!podeVerDashboard) return;
    if (!session?.access_token || !session?.usuario) return;
    if (!isPontoFocal && !isCoordenador && !isDiretor) return;

    // O ID do usuário vem do campo `sub` no token JWT decodificado
    const userId = (session.usuario as IUsuarioSession).sub as string | undefined;
    if (!userId) return;

    usuario
      .buscarPorId(userId)
      .then((resp) => {
        if (!resp.ok || !resp.data) return;
        const u = resp.data as IUsuario;
        if (u.divisao?.coordenadoria) {
          const coord = u.divisao.coordenadoria as ICoordenadoria;
          setCoordenadoriaUsuario(coord);
          setCoordenadoriaId(coord.id);
          divisoes
            .listaCompleta(coord.id)
            .then((respDiv) => {
              if (respDiv.ok && respDiv.data && Array.isArray(respDiv.data)) {
                setDivisoesLista(respDiv.data);
              }
            });
        }
        if (u.divisaoId && isDiretor) {
          setDivisaoId(u.divisaoId);
        }
      })
      .catch(() => {
        // Em caso de erro, apenas não exibe a coordenadoria
      });
  }, [session?.access_token, session?.usuario, isPontoFocal, isCoordenador, isDiretor, podeVerDashboard]);

  useEffect(() => {
    if (!session?.access_token || !podeVerDashboard) {
      setLoading(false);
      return;
    }
    setDashboard(null);
    setLoading(true);
    const id = ++requestIdRef.current;

    let dataInicio: string | undefined;
    let dataFim: string | undefined;
    if (tipoPeriodo === "semana" && semanaInicio) {
      const seg = new Date(semanaInicio + "T00:00:00");
      const dom = new Date(seg);
      dom.setDate(dom.getDate() + 6);
      dom.setHours(23, 59, 59, 999);
      dataInicio = seg.toISOString();
      dataFim = dom.toISOString();
    } else if (tipoPeriodo === "mes" && mes >= 1 && mes <= 12) {
      const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = new Date(ano, mes - 1, ultimoDia, 23, 59, 59, 999);
      dataInicio = inicio.toISOString();
      dataFim = fim.toISOString();
    } else if (tipoPeriodo === "ano") {
      const inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
      const fim = new Date(ano, 11, 31, 23, 59, 59, 999);
      dataInicio = inicio.toISOString();
      dataFim = fim.toISOString();
    }

    const opts = {
      tipoPeriodo,
      ano,
      ...(tipoPeriodo === "mes" && { mes }),
      ...(tipoPeriodo === "semana" && { semanaInicio }),
      ...(dataInicio && { dataInicio }),
      ...(dataFim && { dataFim }),
      ...(coordenadoriaId && { coordenadoriaId }),
      ...(divisaoId && { divisaoId }),
    };
    agendamentos
      .getDashboard(opts)
      .then((r) => {
        if (id !== requestIdRef.current) return;
        if (r.ok && r.data) setDashboard(r.data);
        else if (r.error)
          toast.error("Erro ao carregar dashboard", { description: r.error });
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [session?.access_token, tipoPeriodo, ano, mes, semanaInicio, coordenadoriaId, divisaoId, podeVerDashboard]);

  if (!podeVerDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-xl text-muted-foreground text-center">
          Você não tem permissão para acessar o dashboard.
        </p>
      </div>
    );
  }

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Carregando dashboard...</span>
      </div>
    );
  }

  const dados = dashboard ?? {
    totalGeral: 0,
    realizados: 0,
    naoRealizados: 0,
    apenasNaoRealizado: 0,
    diasComAgendamentos: 0,
    porMes: [],
    porAno: [],
    porDia: [],
    porSemana: [],
    motivosNaoRealizacao: [],
  };

  // Total do período: usar totalGeral do backend (filtrado por dataInicio/dataFim)
  // Se os arrays do gráfico estiverem populados, usar a soma como validação
  const totalPeriodo = dados.totalGeral;

  const total = totalPeriodo;
  const percentualRealizados =
    total > 0 ? ((dados.realizados / total) * 100).toFixed(1) : "0";
  const percentualNaoRealizados =
    total > 0 ? ((dados.naoRealizados / total) * 100).toFixed(1) : "0";
  const taxaAbsenteismo =
    total > 0 ? ((dados.apenasNaoRealizado / total) * 100).toFixed(1) : "0";
  const mediaDiaria =
    total > 0 && dados.diasComAgendamentos > 0
      ? (total / dados.diasComAgendamentos).toFixed(1)
      : "0";

  const chartConfigMes: ChartConfig = {
    mes: { label: "Mês" },
    total: { label: "Agendamentos" },
  };

  const chartConfigDia: ChartConfig = {
    label: { label: "Dia" },
    total: { label: "Agendamentos" },
  };

  const chartConfigSemana: ChartConfig = {
    label: { label: "Semana" },
    total: { label: "Agendamentos" },
  };

  const chartConfigAno: ChartConfig = {
    ano: { label: "Ano" },
    total: { label: "Agendamentos" },
  };

  const chartConfigMotivos: ChartConfig = {
    motivo: { label: "Motivo" },
    total: { label: "Quantidade" },
  };

  const dadosPorMes = formatarPorMes(dados.porMes);
  const dadosPorDia = (dados.porDia ?? []).map((p) => ({
    label: p.label,
    total: p.total,
    fill: "hsl(var(--chart-1))",
  }));
  const dadosPorSemana = (dados.porSemana ?? []).map((p) => ({
    label: p.label,
    total: p.total,
    fill: "hsl(var(--chart-2))",
  }));
  const dadosPorAno = dados.porAno.map((p) => ({
    ano: String(p.ano),
    total: p.total,
    fill: "hsl(var(--chart-2))",
  }));
  const dadosMotivos = dados.motivosNaoRealizacao.map((m) => ({
    motivo:
      m.motivoTexto.length > 30
        ? m.motivoTexto.slice(0, 30) + "…"
        : m.motivoTexto,
    total: m.total,
    fill: "hsl(var(--chart-3))",
  }));

  const labelSemana =
    tipoPeriodo === "semana" && semanaInicio
      ? formatarIntervaloSemana(semanaInicio)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between flex-wrap">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end flex-wrap gap-y-2">
          <div className="space-y-2">
            <Label htmlFor="tipoPeriodo">Visualizar por</Label>
            <Select
              value={tipoPeriodo}
              onValueChange={(v) => setTipoPeriodo(v as TipoPeriodoDashboard)}
            >
              <SelectTrigger id="tipoPeriodo" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
                <SelectItem value="ano">Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipoPeriodo === "ano" && (
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Select
                value={String(ano)}
                onValueChange={(v) => setAno(Number(v))}
              >
                <SelectTrigger id="ano" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          {tipoPeriodo === "mes" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ano-mes">Ano</Label>
                <Select
                  value={String(ano)}
                  onValueChange={(v) => setAno(Number(v))}
                >
                  <SelectTrigger id="ano-mes" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const y = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mes">Mês</Label>
                <Select
                  value={String(mes)}
                  onValueChange={(v) => setMes(Number(v))}
                >
                  <SelectTrigger id="mes" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((nome, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {tipoPeriodo === "semana" && (
            <div className="flex items-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(semanaInicio + "T12:00:00");
                  d.setDate(d.getDate() - 7);
                  setSemanaInicio(format(getSegundaFeira(d), "yyyy-MM-dd"));
                }}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 py-2 min-w-[160px] text-center text-sm border rounded-md bg-muted/50">
                {labelSemana ?? "—"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(semanaInicio + "T12:00:00");
                  d.setDate(d.getDate() + 7);
                  setSemanaInicio(format(getSegundaFeira(d), "yyyy-MM-dd"));
                }}
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {(isAdmOuDev || isPontoFocal || isCoordenador) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="coordenadoria">Coordenadoria</Label>
                <Select
                  value={coordenadoriaId || "todos"}
                  onValueChange={(v) => {
                    const novoCoord = v === "todos" ? "" : v;
                    setCoordenadoriaId(novoCoord);
                    setDivisaoId("");
                    if (novoCoord) {
                      divisoes.listaCompleta(novoCoord).then((resp) => {
                        if (resp.ok && resp.data && Array.isArray(resp.data)) {
                          setDivisoesLista(resp.data);
                        }
                      });
                    } else if (isAdmOuDev) {
                      divisoes.listaCompleta().then((resp) => {
                        if (resp.ok && resp.data && Array.isArray(resp.data)) {
                          setDivisoesLista(resp.data);
                        }
                      });
                    }
                  }}
                  disabled={!isAdmOuDev}
                >
                  <SelectTrigger id="coordenadoria" className="w-[220px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmOuDev && <SelectItem value="todos">Todos</SelectItem>}
                    {(isAdmOuDev ? coordenadoriasLista : coordenadoriaUsuario ? [coordenadoriaUsuario] : []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.sigla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="divisao">Divisão</Label>
                <Select
                  value={divisaoId || "todas"}
                  onValueChange={(v) => setDivisaoId(v === "todas" ? "" : v)}
                >
                  <SelectTrigger id="divisao" className="w-[220px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {divisoesLista.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.sigla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de agendamentos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              {tipoPeriodo === "semana" && labelSemana}
              {tipoPeriodo === "mes" && `${MESES[mes - 1]}/${ano}`}
              {tipoPeriodo === "ano" && `Ano ${ano}`}
              {divisaoId
                ? " (por divisão)"
                : coordenadoriaId
                ? " (por coordenadoria)"
                : (isPontoFocal || isCoordenador) && coordenadoriaUsuario
                  ? ` (${coordenadoriaUsuario.sigla})`
                  : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% realizados</CardTitle>
            <Percent className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {percentualRealizados}%
            </div>
            <p className="text-xs text-muted-foreground">
              ATENDIDO + CONCLUIDO
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              % não realizados
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {percentualNaoRealizados}%
            </div>
            <p className="text-xs text-muted-foreground">
              NAO_REALIZADO + CANCELADO
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de absenteísmo
            </CardTitle>
            <UserX className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {taxaAbsenteismo}%
            </div>
            <p className="text-xs text-muted-foreground">
              NAO_REALIZADO / total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média diária</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaDiaria}</div>
            <p className="text-xs text-muted-foreground">
              Média por dia com agendamento ({dados.diasComAgendamentos} dias)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico principal: muda conforme o período (7 dias / 4 semanas / 12 meses) */}
      <Card>
        <CardHeader>
          <CardTitle>
            {tipoPeriodo === "semana" && "Agendamentos por dia"}
            {tipoPeriodo === "mes" && "Agendamentos por semana"}
            {tipoPeriodo === "ano" && "Agendamentos por mês"}
          </CardTitle>
          <CardDescription>
            {tipoPeriodo === "semana" && "7 dias da semana (seg–dom)"}
            {tipoPeriodo === "mes" && "4 semanas do mês"}
            {tipoPeriodo === "ano" && "12 meses do ano"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tipoPeriodo === "semana" && (
            <ChartContainer
              config={chartConfigDia}
              className="h-[280px] w-full"
            >
              <BarChart data={dadosPorDia} margin={{ left: 12, right: 12 }}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {tipoPeriodo === "mes" && (
            <ChartContainer
              config={chartConfigSemana}
              className="h-[280px] w-full"
            >
              <BarChart data={dadosPorSemana} margin={{ left: 12, right: 12 }}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {tipoPeriodo === "ano" && (
            <ChartContainer
              config={chartConfigMes}
              className="h-[280px] w-full"
            >
              <BarChart data={dadosPorMes} margin={{ left: 12, right: 12 }}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Agendamentos por ano</CardTitle>
            <CardDescription>Últimos anos (visão geral)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfigAno}
              className="h-[280px] w-full"
            >
              <BarChart data={dadosPorAno} margin={{ left: 12, right: 12 }}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ano" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motivos de não realização</CardTitle>
          <CardDescription>
            Quantidade por motivo quando o status é &quot;Não realizado&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dadosMotivos.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              Nenhum agendamento com status &quot;Não realizado&quot; no
              período.
            </p>
          ) : (
            <ChartContainer
              config={chartConfigMotivos}
              className="h-[300px] w-full"
            >
              <BarChart
                data={dadosMotivos}
                layout="vertical"
                margin={{ left: 8, right: 40 }}
              >
                <ChartTooltip content={<ChartTooltipContent />} />
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="motivo"
                  tickLine={false}
                  axisLine={false}
                  width={180}
                  tick={{ fontSize: 12 }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
