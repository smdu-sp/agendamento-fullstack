/** @format */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as agendamento from "@/services/agendamentos";
import * as usuario from "@/services/usuarios";
import type { ISolicitacaoPreProjetoArthurSaboya } from "@/types/solicitacao-pre-projeto-arthur-saboya";
import { formatarDataHoraSaoPaulo } from "@/lib/date-time";

const LIMITE = 15;
const PATH_CHAMADO = "/pedidos-pre-projetos-arthur-saboya";

type FiltroStatus =
  | ""
  | "SOLICITADO"
  | "RESPONDIDO"
  | "AGUARDANDO_DATA"
  | "AGENDAMENTO_CRIADO";

function rotuloStatus(s: ISolicitacaoPreProjetoArthurSaboya["status"]) {
  switch (s) {
    case "SOLICITADO":
      return "Solicitado";
    case "RESPONDIDO":
      return "Concluído";
    case "AGUARDANDO_DATA":
      return "Aguardando data";
    case "AGENDAMENTO_CRIADO":
      return "Agendado";
    default:
      return s;
  }
}

function StatusChip({
  status,
}: {
  status: ISolicitacaoPreProjetoArthurSaboya["status"];
}) {
  const configs: Record<string, { bg: string; text: string; dot: string }> = {
    SOLICITADO: { bg: "#EAF0FB", text: "#0A328D", dot: "#0A328D" },
    RESPONDIDO: { bg: "#EDF7F5", text: "#0f8578", dot: "#5CC9BD" },
    AGUARDANDO_DATA: { bg: "#FDF3EB", text: "#a94a08", dot: "#E56E14" },
    AGENDAMENTO_CRIADO: { bg: "#F3F0FB", text: "#4a2098", dot: "#7c3aed" },
  };
  const cfg = configs[status] ?? {
    bg: "#F1F5F9",
    text: "#475569",
    dot: "#94A3B8",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: cfg.dot }}
      />
      {rotuloStatus(status)}
    </span>
  );
}

function NovaMensagem({ novaMensagem }: { novaMensagem: boolean }) {
  return novaMensagem ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{ backgroundColor: "#EDF7F5", color: "#0f8578" }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: "#5CC9BD" }}
      />
      Novo
    </span>
  ) : null;
}

interface Stats {
  total: number;
  solicitados: number;
  aguardando: number;
  respondidos: number;
  enviados: number;
}

export default function ListaPedidosPreProjetos() {
  const { data: session, status } = useSession();
  const token = session?.access_token;
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("SOLICITADO");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [itens, setItens] = useState<ISolicitacaoPreProjetoArthurSaboya[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [coordenadoriaUsuarioId, setCoordenadoriaUsuarioId] =
    useState<string>("");

  const carregarStats = useCallback(async () => {
    if (!token) return;
    const [resAll, resSol, resAguard, resResp, resEnv] = await Promise.all([
      agendamento.buscarSolicitacoesPortalArthurSaboya(token, 1, 1, "", ""),
      agendamento.buscarSolicitacoesPortalArthurSaboya(
        token,
        1,
        1,
        "",
        "SOLICITADO",
      ),
      agendamento.buscarSolicitacoesPortalArthurSaboya(
        token,
        1,
        1,
        "",
        "AGUARDANDO_DATA",
      ),
      agendamento.buscarSolicitacoesPortalArthurSaboya(
        token,
        1,
        1,
        "",
        "RESPONDIDO",
      ),
      agendamento.buscarSolicitacoesPortalArthurSaboya(
        token,
        1,
        1,
        "",
        "AGENDAMENTO_CRIADO",
      ),
    ]);
    setStats({
      total: resAll.data?.total ?? 0,
      solicitados: resSol.data?.total ?? 0,
      aguardando: resAguard.data?.total ?? 0,
      respondidos: resResp.data?.total ?? 0,
      enviados: resEnv.data?.total ?? 0,
    });
  }, [token]);

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    const res = await agendamento.buscarSolicitacoesPortalArthurSaboya(
      token,
      pagina,
      LIMITE,
      busca,
      filtroStatus,
    );
    if (!res.ok || !res.data) {
      setErro(res.error ?? "Falha ao carregar.");
      setItens([]);
      setTotal(0);
      setCarregando(false);
      return;
    }
    setItens(res.data.data);
    setTotal(res.data.total);
    setCarregando(false);
  }, [token, pagina, busca, filtroStatus]);

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      setCarregando(false);
      return;
    }
    void carregar();
  }, [status, token, carregar]);

  useEffect(() => {
    if (status === "loading" || !token) return;
    void carregarStats();
  }, [status, token, carregarStats]);

  useEffect(() => {
    if (status === "loading" || !token) return;
    const permissao = String(
      (session?.usuario as { permissao?: string } | undefined)?.permissao ?? "",
    );
    if (permissao !== "PONTO_FOCAL" && permissao !== "COORDENADOR") return;
    const userId = (session?.usuario as { sub?: string } | undefined)?.sub;
    if (!userId) return;
    void (async () => {
      const r = await usuario.buscarPorId(userId);
      if (!r.ok || !r.data || Array.isArray(r.data) || !("id" in r.data))
        return;
      const coordId = r.data.divisao?.coordenadoriaId?.trim();
      if (coordId) setCoordenadoriaUsuarioId(coordId);
    })();
  }, [status, token, session?.usuario]);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  if (status === "loading" || !token) {
    return (
      <p className="py-6 text-center text-sm text-[#64748B]">
        {status === "loading" ? "Carregando sessão…" : "Sessão indisponível."}
      </p>
    );
  }

  const FILTROS: {
    k: FiltroStatus;
    label: string;
    count: number | undefined;
  }[] = [
    { k: "SOLICITADO", label: "Solicitados", count: stats?.solicitados },
    {
      k: "AGUARDANDO_DATA",
      label: "Aguardando data",
      count: stats?.aguardando,
    },
    { k: "AGENDAMENTO_CRIADO", label: "Agendados", count: stats?.enviados },
    { k: "RESPONDIDO", label: "Concluídos", count: stats?.respondidos },
    { k: "", label: "Todos", count: stats?.total },
  ];

  const permissaoUsuario = String(
    (session?.usuario as { permissao?: string } | undefined)?.permissao ?? "",
  );
  const permissaoReal = String(
    (session?.usuario as { permissaoReal?: string } | undefined)
      ?.permissaoReal ?? "",
  );
  const divisaoUsuario = (
    session?.usuario as { divisaoId?: string } | undefined
  )?.divisaoId?.trim();
  const divisaoArthur = process.env.NEXT_PUBLIC_DIVISAO_ID_PRE_PROJETOS?.trim();
  const isDevRealOuEfetivo =
    permissaoUsuario === "DEV" || permissaoReal === "DEV";
  const isAdmRealOuEfetivo =
    permissaoUsuario === "ADM" || permissaoReal === "ADM";
  const isTecnicoCoordenadoria =
    permissaoUsuario === "TEC" &&
    !!divisaoUsuario &&
    (!divisaoArthur || divisaoUsuario !== divisaoArthur);
  const isTecAs =
    permissaoUsuario === "ARTHUR_SABOYA" ||
    permissaoUsuario === "TEC_AS" ||
    (permissaoUsuario === "TEC" &&
      !!divisaoArthur &&
      !!divisaoUsuario &&
      divisaoUsuario === divisaoArthur);
  const isPontoFocalOuCoordenador =
    permissaoUsuario === "PONTO_FOCAL" || permissaoUsuario === "COORDENADOR";
  const isAdmArthur =
    isDevRealOuEfetivo ||
    (isAdmRealOuEfetivo &&
      !!divisaoArthur &&
      !!divisaoUsuario &&
      divisaoUsuario === divisaoArthur);
  const podeConcluirNaTabela = isTecAs || isTecnicoCoordenadoria || isAdmArthur;

  const itensFiltrados =
    !isDevRealOuEfetivo && isPontoFocalOuCoordenador && coordenadoriaUsuarioId
      ? itens.filter(
          (row) =>
            (row.coordenadoriaId || "").trim() === coordenadoriaUsuarioId,
        )
      : itens;

  const handleConcluirAtendimento = async (protocolo: string) => {
    if (!token) return;
    setConcluindoId(protocolo);
    const res = await agendamento.confirmarRespostaEnviadaPortalArthurSaboya(
      token,
      protocolo,
    );
    setConcluindoId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível concluir o atendimento.");
      return;
    }
    toast.success("Atendimento concluído com sucesso.");
    await carregar();
    await carregarStats();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Total",
            value: stats?.total,
            accent: "#0A328D",
            trend: "Todos os pedidos registrados",
          },
          {
            label: "Solicitados",
            value: stats?.solicitados,
            accent: "#0A328D",
            trend: "Aguardando primeira resposta",
          },
          {
            label: "Aguardando data",
            value: stats?.aguardando,
            accent: "#E56E14",
            trend: "Aguardando agendamento",
          },
          {
            label: "Solucionados",
            value: stats?.respondidos,
            accent: "#5CC9BD",
            trend: "Encerrados na sala",
          },
          {
            label: "Enviados",
            value: stats?.enviados,
            accent: "#7c3aed",
            trend: "Encaminhados à coordenadoria",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1.5 rounded-[12px] border border-[#E5EAF2] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={{ borderLeftWidth: 3, borderLeftColor: s.accent }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              {s.label}
            </p>
            <p
              className="text-2xl font-bold tracking-tight tabular-nums"
              style={{ color: s.accent }}
            >
              {s.value ?? "—"}
            </p>
            <p className="text-[11.5px] leading-snug text-[#64748B]">
              {s.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap items-end gap-2.5 gap-y-3">
        <div className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              id="busca-pedidos"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              placeholder="Buscar por protocolo, munícipe, e-mail ou trecho da dúvida…"
              className="h-10 rounded-lg border-[#D7DFEA] bg-white pl-9 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:border-[#0A328D]/40 focus-visible:ring-[#0A328D]/15"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPagina(1);
                  setBusca(buscaInput.trim());
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]"
            onClick={() => {
              setPagina(1);
              setBusca(buscaInput.trim());
            }}
          >
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[10px] border border-[#E5EAF2] bg-[#F1F5F9] p-0.5">
          {FILTROS.map((f) => {
            const active = filtroStatus === f.k;
            return (
              <button
                key={f.k}
                type="button"
                onClick={() => {
                  setPagina(1);
                  setFiltroStatus(f.k);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all"
                style={
                  active
                    ? {
                        backgroundColor: "#fff",
                        color: "#0A328D",
                        boxShadow: "0 1px 2px rgba(15,23,42,.06)",
                      }
                    : { color: "#64748B" }
                }
              >
                {f.label}
                {f.count !== undefined && (
                  <span
                    className="rounded-full px-1.5 py-px text-[11px] font-bold"
                    style={
                      active
                        ? {
                            backgroundColor: "rgba(10,50,141,0.1)",
                            color: "#0A328D",
                          }
                        : {
                            backgroundColor: "rgba(0,0,0,0.06)",
                            color: "#64748B",
                          }
                    }
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {erro ? (
        <div
          role="alert"
          className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {erro}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[14px] border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px] text-[14px]">
            <TableHeader>
              <TableRow className="border-[#E5EAF2] hover:bg-transparent">
                <TableHead></TableHead>
                <TableHead className="h-11 w-[140px] min-w-[120px] whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B] first:pl-4 sm:first:pl-6">
                  Protocolo
                </TableHead>
                <TableHead className="h-11 min-w-[180px] bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Munícipe
                </TableHead>
                <TableHead className="h-11 w-[130px] min-w-[118px] whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Status
                </TableHead>
                <TableHead className="h-11 w-[150px] min-w-[130px] whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Abertura
                </TableHead>
                <TableHead className="h-11 w-[170px] min-w-[150px] whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Data agendamento
                </TableHead>
                <TableHead className="h-11 min-w-[160px] bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Coordenadoria
                </TableHead>
                <TableHead className="h-11 min-w-[170px] bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Técnico Arthur Saboya
                </TableHead>
                <TableHead className="h-11 min-w-[130px] whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Ação
                </TableHead>
                <TableHead className="h-11 w-10 bg-[#F8FAFC] px-0 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B] last:pr-4 sm:last:pr-6">
                  <span className="sr-only">Abrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow className="border-[#E5EAF2] hover:bg-transparent">
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-[#64748B]"
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : itensFiltrados.length === 0 ? (
                <TableRow className="border-[#E5EAF2] hover:bg-transparent">
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-[#64748B]"
                  >
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                itensFiltrados.map((row) => (
                  <TableRow
                    key={row.id}
                    className="relative cursor-pointer border-[#E5EAF2] hover:bg-[#F8FAFC]"
                  >
                    <TableCell>
                      <NovaMensagem
                        novaMensagem={
                          row.mensagens.length > 0 &&
                          row.mensagens[0].autor === "MUNICIPE"
                        }
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 font-mono text-[13.5px] font-medium text-[#0F172A] first:pl-4 sm:first:pl-6">
                      <a
                        href={`/agendamento/${PATH_CHAMADO}/${encodeURIComponent(row.protocolo)}`}
                        className="absolute inset-0"
                        aria-label={`Abrir pedido ${row.protocolo}`}
                      />
                      {row.protocolo}
                    </TableCell>
                    <TableCell className="max-w-[240px] px-3 py-2.5">
                      <div className="truncate font-medium text-[#0F172A]">
                        {row.nome}
                      </div>
                      <div className="truncate text-[11.5px] text-[#64748B]">
                        {row.formacaoTexto}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <StatusChip status={row.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-[13.5px] text-[#64748B]">
                      {formatarDataHoraSaoPaulo(row.criadoEm)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-[13.5px] text-[#64748B]">
                      {row.dataAgendamento
                        ? formatarDataHoraSaoPaulo(row.dataAgendamento)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate px-3 py-2.5 text-[#64748B]">
                      {row.coordenadoriaTexto?.trim() || "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate px-3 py-2.5 text-[#64748B]">
                      {row.tecnicoArthurNome?.trim() || "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {podeConcluirNaTabela ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border-[#D7DFEA] px-2.5 text-xs"
                          disabled={
                            row.status !== "AGENDAMENTO_CRIADO" ||
                            concluindoId === row.protocolo
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleConcluirAtendimento(row.protocolo);
                          }}
                        >
                          Concluir
                        </Button>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-10 px-0 text-[#94A3B8] last:pr-4 sm:last:pr-6">
                      <ChevronRight
                        className="mx-auto h-4 w-4 shrink-0"
                        aria-hidden
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {total > LIMITE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF2] px-4 py-3.5 text-[13px] text-[#64748B] sm:px-5">
            <span>
              Página {pagina} de {totalPaginas} — {total} registro(s)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-[#D7DFEA] bg-transparent text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]"
                disabled={pagina <= 1 || carregando}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-[#D7DFEA] bg-transparent text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]"
                disabled={pagina >= totalPaginas || carregando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        ) : total > 0 ? (
          <p className="border-t border-[#E5EAF2] px-4 py-3.5 text-[13px] text-[#64748B] sm:px-5">
            {total} pedido(s).
          </p>
        ) : null}
      </div>
    </div>
  );
}
