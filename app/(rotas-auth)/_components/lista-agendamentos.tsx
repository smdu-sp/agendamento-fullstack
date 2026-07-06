"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as agendamento from "@/services/agendamentos";
import { IAgendamento } from "@/types/agendamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Eye, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Pagination from "@/components/pagination";
import AtribuirTecnico from "./atribuir-tecnico";
import ConfirmarAtendimento from "./confirmar-atendimento";
import { Pencil, CheckCircle2 } from "lucide-react";
import { StatusAgendamento } from "@/types/agendamento";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useEffectivePermissao } from "@/providers/ImpersonationProvider";
import { abrirOutlookComposeAgendamentoTecnico } from "@/lib/outlook-agendamento-teams";
import {
  formatarDataHoraSaoPaulo,
  instanteUtcRealDesdeDataHoraApi,
} from "@/lib/date-time";
import Link from "@/components/link";

/** Converte valor da API (ISO em UTC) para `Date` do instante correto; formata no fuso do navegador. */
const paraDateAgendamento = (data: Date | string): Date =>
  typeof data === "string" ? new Date(data) : data;

const formatarDataHora = (data: Date | string): string => {
  return formatarDataHoraSaoPaulo(data, true);
};

function montarAssuntoEIntervaloIsoOutlook(agend: IAgendamento) {
  const coordenadoriaSigla = agend.coordenadoria?.sigla ?? "";
  const processo = agend.processo ?? "";
  const assunto =
    `Agendamento Técnico - ${coordenadoriaSigla} - Processo: ${processo}`.trim();
  const inicio = paraDateAgendamento(agend.dataHora);
  const fim = agend.dataFim
    ? paraDateAgendamento(agend.dataFim)
    : new Date(inicio.getTime() + 60 * 60 * 1000);
  const inicioUtc = instanteUtcRealDesdeDataHoraApi(inicio);
  const fimUtc = instanteUtcRealDesdeDataHoraApi(fim);
  return {
    assunto,
    inicioIso: inicioUtc.toISOString(),
    fimIso: fimUtc.toISOString(),
  };
}

const PROCESSO_DIGITAL_REGEX = /^\d{4}\.\d{4}\/\d{7}-\d$/;

const isProcessoDigital = (processo?: string): boolean => {
  const valor = (processo || "").trim();
  return PROCESSO_DIGITAL_REGEX.test(valor);
};

const getTipoProcesso = (processo?: string): "Digital" | "Físico" =>
  isProcessoDigital(processo) ? "Digital" : "Físico";

interface ListaAgendamentosProps {
  dados: IAgendamento[];
  total: number;
  pagina: number;
  limite: number;
  busca: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  ultimaImportacao?: { dataHora: string; total: number; usuarioNome?: string | null } | null;
  tipoProcessoFixo?: "DIGITAL" | "FISICO";
}

export default function ListaAgendamentos({
  dados: agendamentos,
  total,
  pagina,
  limite,
  busca,
  status,
  dataInicio,
  ultimaImportacao,
  tipoProcessoFixo,
}: ListaAgendamentosProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const effectivePermissao = useEffectivePermissao();
  const [agendamentoParaConfirmar, setAgendamentoParaConfirmar] =
    useState<IAgendamento | null>(null);
  const [agendamentoParaConfirmarOutlook, setAgendamentoParaConfirmarOutlook] =
    useState<IAgendamento | null>(null);
  const [confirmandoOutlook, setConfirmandoOutlook] = useState(false);
  const [buscaInput, setBuscaInput] = useState(busca);

  const atualizarUrl = useCallback(
    (updates: {
      pagina?: number;
      busca?: string;
      status?: string;
      tipoProcesso?: string;
      dataInicio?: string;
      dataFim?: string;
      /** true = listar todas as datas; false = remove o marcador da URL */
      todasDatas?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.pagina !== undefined) params.set("pagina", String(updates.pagina));
      if (updates.busca !== undefined) {
        if (updates.busca) params.set("busca", updates.busca);
        else params.delete("busca");
      }
      if (updates.status !== undefined) {
        if (updates.status) params.set("status", updates.status);
        else params.delete("status");
      }
      if (updates.tipoProcesso !== undefined) {
        if (updates.tipoProcesso) params.set("tipoProcesso", updates.tipoProcesso);
        else params.delete("tipoProcesso");
      }
      if (updates.dataInicio !== undefined) {
        if (updates.dataInicio) params.set("dataInicio", updates.dataInicio);
        else params.delete("dataInicio");
      }
      if (updates.dataFim !== undefined) {
        if (updates.dataFim) params.set("dataFim", updates.dataFim);
        else params.delete("dataFim");
      }
      if (updates.todasDatas !== undefined) {
        if (updates.todasDatas) params.set("todasDatas", "1");
        else params.delete("todasDatas");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const recarregar = useCallback(() => router.refresh(), [router]);

  const dataSelecionada = dataInicio ? new Date(dataInicio + "T12:00:00") : undefined;

  const handleBusca = (valor: string) => {
    atualizarUrl({ busca: valor, pagina: 1 });
  };

  const handleStatusChange = (valor: string) => {
    atualizarUrl({ status: valor, pagina: 1 });
  };

  const tipoProcesso = searchParams.get("tipoProcesso") || "";
  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "SOLICITADO", label: "Solicitado" },
    { value: "AGENDADO", label: "Agendado" },
    { value: "CONCLUIDO", label: "Concluído" },
    { value: "ATENDIDO", label: "Atendido" },
    { value: "CANCELADO", label: "Cancelado" },
    { value: "NAO_REALIZADO", label: "Não Realizado" },
  ] as const;

  const handleTipoProcessoChange = (valor: string) => {
    if (tipoProcessoFixo) return;
    atualizarUrl({ tipoProcesso: valor, pagina: 1 });
  };

  useEffect(() => {
    setBuscaInput(busca);
  }, [busca]);

  const handleDataChange = (data: Date | undefined) => {
    if (!data) {
      atualizarUrl({
        dataInicio: "",
        dataFim: "",
        pagina: 1,
        todasDatas: true,
      });
      return;
    }
    const s = (n: number) => String(n).padStart(2, "0");
    const str = `${data.getFullYear()}-${s(data.getMonth() + 1)}-${s(data.getDate())}`;
    atualizarUrl({
      dataInicio: str,
      dataFim: str,
      pagina: 1,
      todasDatas: false,
    });
  };

  const handleLimparFiltros = () => {
    setBuscaInput("");
    atualizarUrl({
      busca: "",
      status: "",
      tipoProcesso: tipoProcessoFixo ?? "",
      dataInicio: "",
      dataFim: "",
      pagina: 1,
      todasDatas: true,
    });
  };

  const handleAgendarReuniaoOutlook = (agend: IAgendamento) => {
    const emailCoordenadoria = agend.coordenadoria?.email?.trim();
    if (!emailCoordenadoria) {
      toast.error("E-mail da coordenadoria não cadastrado", {
        description:
          "Cadastre o e-mail da coordenadoria na página de Coordenadorias para que o convite seja enviado pela coordenadoria.",
      });
      return;
    }

    const { assunto, inicioIso, fimIso } = montarAssuntoEIntervaloIsoOutlook(agend);
    const emailMunicipe = (agend.email || "").trim();
    const emailTecnico = (agend.tecnico?.email || "").trim();

    abrirOutlookComposeAgendamentoTecnico({
      emailOrganizadorCoordenadoria: emailCoordenadoria,
      assunto,
      inicioIso,
      fimIso,
      emailsParticipantes: [emailMunicipe, emailTecnico],
    });
    setAgendamentoParaConfirmarOutlook(agend);
  };

  const handleConfirmarAgendadoOutlook = async (confirmado: boolean) => {
    if (!agendamentoParaConfirmarOutlook || !session?.access_token) {
      setAgendamentoParaConfirmarOutlook(null);
      return;
    }
    if (confirmado) {
      setConfirmandoOutlook(true);
      try {
        const res = await agendamento.atualizar(
          agendamentoParaConfirmarOutlook.id,
          { status: StatusAgendamento.AGENDADO },
        );
        if (res.ok) recarregar();
      } finally {
        setConfirmandoOutlook(false);
      }
    }
    setAgendamentoParaConfirmarOutlook(null);
  };

  return (
    <div className="space-y-5">
      {ultimaImportacao?.dataHora && (
        <p className="text-xs text-[#64748B]">
          Última importação:{" "}
                            {formatarDataHoraSaoPaulo(ultimaImportacao.dataHora, true)}
          {ultimaImportacao.usuarioNome
            ? ` por ${ultimaImportacao.usuarioNome}`
            : ""}
        </p>
      )}

      <div className="mb-3.5 flex flex-wrap items-end gap-2.5 gap-y-3">
        <div className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-full justify-start rounded-lg border-[#D7DFEA] bg-white text-left text-[13px] font-normal text-[#0F172A] sm:w-[200px]",
                  !dataSelecionada && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataSelecionada ? (
                  format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={handleDataChange}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              placeholder="Buscar por munícipe, processo, CPF..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBusca(buscaInput);
              }}
              className="h-10 rounded-lg border-[#D7DFEA] bg-white pl-9 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:border-[#0A328D]/40 focus-visible:ring-[#0A328D]/15"
            />
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]"
            onClick={() => handleBusca(buscaInput)}
          >
            Buscar
          </Button>
          {(status || tipoProcesso || dataSelecionada || busca) && (
            <Button
              variant="outline"
              onClick={handleLimparFiltros}
              className="h-10 shrink-0 rounded-lg border-[#D7DFEA] bg-transparent px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]"
            >
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[10px] border border-[#E5EAF2] bg-[#F1F5F9] p-0.5">
          {statusOptions.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value || "todos"}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all"
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
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!tipoProcessoFixo && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={tipoProcesso === "" ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors select-none",
              tipoProcesso === "" && "bg-primary text-primary-foreground",
            )}
            onClick={() => handleTipoProcessoChange("")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTipoProcessoChange("");
              }
            }}
          >
            Todos os processos
          </Badge>
          <Badge
            variant={tipoProcesso === "DIGITAL" ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors select-none",
              tipoProcesso === "DIGITAL" && "bg-primary text-primary-foreground",
            )}
            onClick={() => handleTipoProcessoChange("DIGITAL")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTipoProcessoChange("DIGITAL");
              }
            }}
          >
            Digitais
          </Badge>
          <Badge
            variant={tipoProcesso === "FISICO" ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors select-none",
              tipoProcesso === "FISICO" && "bg-primary text-primary-foreground",
            )}
            onClick={() => handleTipoProcessoChange("FISICO")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTipoProcessoChange("FISICO");
              }
            }}
          >
            Físicos
          </Badge>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px] text-[14px]">
            <TableHeader>
              <TableRow className="border-[#E5EAF2] hover:bg-transparent">
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B] first:pl-4 sm:first:pl-6">Data e Hora de início</TableHead>
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Munícipe</TableHead>
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Processo</TableHead>
                {!tipoProcessoFixo && (
                  <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Tipo</TableHead>
                )}
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Divisão</TableHead>
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Técnico</TableHead>
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Status</TableHead>
                <TableHead className="h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendamentos.length === 0 ? (
                <TableRow className="border-[#E5EAF2] hover:bg-transparent">
                  <TableCell colSpan={tipoProcessoFixo ? 7 : 8} className="py-10 text-center text-[#64748B]">
                    Nenhum agendamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                agendamentos.map((agend) => {
                  const permissao = (effectivePermissao ??
                    session?.usuario?.permissao) as string | undefined;
                  const isPontoFocal = permissao === "PONTO_FOCAL";
                  const isCoordenador = permissao === "COORDENADOR";
                  const isTecnico = permissao === "TEC";
                  const isAdm = permissao === "ADM";
                  const isDev = permissao === "DEV";
                  const semTecnico = !agend.tecnico;
                  // Atribuir/editar técnico: Ponto Focal e Coordenador (quando há coordenadoria); ADM/DEV só quando status Atendido ou Não Realizado
                  const podeAtribuir =
                    !!agend.coordenadoriaId &&
                    (isPontoFocal ||
                      isCoordenador ||
                      ((isAdm || isDev) &&
                        (agend.status === StatusAgendamento.ATENDIDO ||
                          agend.status ===
                            StatusAgendamento.NAO_REALIZADO)));

                  // Verifica se o técnico logado é o técnico do agendamento
                  // O JWT usa 'sub' como campo do ID do usuário
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const usuarioId = session?.usuario?.sub || (session?.usuario as any)?.id;
                  const tecnicoIdMatch = agend.tecnicoId === usuarioId;

                  // Sem técnico: desabilita ações até o ponto focal atribuir
                  const acoesDesabilitadas = semTecnico;

                  // Pendentes: técnico ainda não confirmou (AGENDADO ou CONCLUIDO)
                  const statusPendente =
                    agend.status === StatusAgendamento.AGENDADO ||
                    agend.status === StatusAgendamento.CONCLUIDO;
                  // Já confirmados: técnico já alterou (ATENDIDO ou NAO_REALIZADO)
                  const statusJaConfirmado =
                    agend.status === StatusAgendamento.ATENDIDO ||
                    agend.status === StatusAgendamento.NAO_REALIZADO;

                  // Confirmar: técnico do agendamento, ou ADM/DEV, ou coordenador quando é o técnico
                  const basePode =
                    (isTecnico || isAdm || isDev || isCoordenador) &&
                    tecnicoIdMatch;
                  const podeConfirmar =
                    basePode && statusPendente && !acoesDesabilitadas;
                  // Alterar: técnico do agendamento OU ADM/DEV/Ponto Focal/Coordenador
                  const podeAlterar =
                    statusJaConfirmado &&
                    !acoesDesabilitadas &&
                    ((isTecnico && tecnicoIdMatch) ||
                      isAdm ||
                      isDev ||
                      isPontoFocal ||
                      isCoordenador);

                  // Agendar reunião: ponto focal, coordenador ou ADM/DEV, com técnico atribuído e status SOLICITADO
                  const podeAgendarReuniao =
                    (isPontoFocal || isCoordenador || isAdm || isDev) &&
                    !semTecnico &&
                    agend.status === StatusAgendamento.SOLICITADO;

                  // Aplica cor de fundo: vermelho para importação Outlook; amarelo para sem técnico/AGENDADO
                  const importadoOutlook = !!agend.importadoOutlook;
                  const deveDestacar =
                    semTecnico ||
                    agend.status === StatusAgendamento.AGENDADO;
                  const rowClassName = importadoOutlook
                    ? "bg-red-100 hover:bg-red-200 text-black"
                    : deveDestacar
                      ? "bg-yellow-100 hover:bg-yellow-200 text-black"
                      : "";

                  return (
                    <TableRow
                      key={agend.id}
                      className={`${rowClassName} cursor-pointer border-[#E5EAF2] hover:bg-[#F8FAFC]`}
                    >
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-[13.5px] text-[#0F172A] first:pl-4 sm:first:pl-6">
                        {formatarDataHora(agend.dataHora)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-[13.5px]">{agend.municipe || "-"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-[13.5px]">{agend.processo || "-"}</TableCell>
                      {!tipoProcessoFixo && (
                        <TableCell className="px-3 py-2.5 text-[13.5px]">
                          {getTipoProcesso(agend.processo)}
                        </TableCell>
                      )}
                      <TableCell className="px-3 py-2.5 text-[13.5px]">{agend.tecnico?.divisao?.sigla || "-"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-[13.5px]" onClick={(e) => e.stopPropagation()}>
                        {podeAtribuir ? (
                          <div className="flex flex-col gap-1">
                            <AtribuirTecnico
                              agendamentoId={agend.id}
                              coordenadoriaId={agend.coordenadoriaId!}
                              tecnicoAtual={agend.tecnico}
                              onSuccess={recarregar}
                            />
                            {agend.importadoOutlook && agend.tecnicoResponsavelPlanilha && !agend.tecnico && (
                              <span className="text-xs text-muted-foreground">
                                Planilha: {agend.tecnicoResponsavelPlanilha}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {agend.tecnico?.nome || (
                              agend.tecnicoResponsavelPlanilha ? (
                                <span className="text-muted-foreground">
                                  Planilha: {agend.tecnicoResponsavelPlanilha}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">
                                  Sem técnico
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-[13.5px]" onClick={(e) => e.stopPropagation()}>
                        <Badge
                          variant={
                            agend.status === StatusAgendamento.CONCLUIDO ||
                            agend.status === StatusAgendamento.ATENDIDO
                              ? "default"
                              : agend.status ===
                                    StatusAgendamento.CANCELADO ||
                                  agend.status ===
                                    StatusAgendamento.NAO_REALIZADO
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {agend.status === StatusAgendamento.ATENDIDO
                            ? "Atendido"
                            : agend.status ===
                                StatusAgendamento.NAO_REALIZADO
                              ? "Não Realizado"
                              : agend.status === StatusAgendamento.CONCLUIDO
                                ? "Concluído"
                                : agend.status ===
                                    StatusAgendamento.CANCELADO
                                  ? "Cancelado"
                                  : agend.status ===
                                      StatusAgendamento.SOLICITADO
                                    ? "Solicitado"
                                    : "Agendado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-[13.5px] flex flex-row gap-2">
                        {podeConfirmar ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setAgendamentoParaConfirmar(agend)
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        ) : podeAlterar ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAgendamentoParaConfirmar(agend)
                            }
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Alterar
                          </Button>
                        ) : null}

                        {(isPontoFocal || isCoordenador || isAdm || isDev) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            disabled={!podeAgendarReuniao}
                            onClick={() => handleAgendarReuniaoOutlook(agend)}
                          >
                            Agendar reunião
                          </Button>
                        )}

                        {!podeConfirmar &&
                          !podeAlterar &&
                          !isPontoFocal &&
                          !isCoordenador && (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        <Link href={`/agendamentos/${agend.id}`} className="ml-2 text-sm text-blue-600 hover:underline">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF2] px-4 py-3.5 text-[13px] text-[#64748B] sm:px-5">
            <span>{total} agendamento(s)</span>
            <Pagination total={total} pagina={pagina} limite={limite} />
          </div>
        )}
      </div>

      {agendamentoParaConfirmar && (
        <ConfirmarAtendimento
          agendamento={agendamentoParaConfirmar}
          onClose={() => setAgendamentoParaConfirmar(null)}
          onSuccess={() => {
            setAgendamentoParaConfirmar(null);
            recarregar();
          }}
        />
      )}

      <AlertDialog
        open={!!agendamentoParaConfirmarOutlook}
        onOpenChange={(open) => !open && setAgendamentoParaConfirmarOutlook(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foi agendado no Outlook?</AlertDialogTitle>
            <AlertDialogDescription>
              O Outlook Web foi aberto com o usuário logado. Após criar a
              reunião no Outlook, confirme aqui para atualizar o status do
              agendamento para &quot;Agendado&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => handleConfirmarAgendadoOutlook(false)}
              disabled={confirmandoOutlook}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmarAgendadoOutlook(true)}
              disabled={confirmandoOutlook}
            >
              {confirmandoOutlook ? "Atualizando…" : "Sim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
