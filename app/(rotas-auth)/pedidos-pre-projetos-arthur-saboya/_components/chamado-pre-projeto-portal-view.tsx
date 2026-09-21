/** @format */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { PreProjetoChamadoChat } from "@/components/arthur-saboya/pre-projeto-chamado-chat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import * as agendamento from "@/services/agendamentos";
import * as coordenadorias from "@/services/coordenadorias";
import * as usuario from "@/services/usuarios";
import { StatusAgendamento } from "@/types/agendamento";
import type { ITecnico } from "@/services/usuarios";
import { ModeToggle } from "@/components/toggle-theme";
import { mensagensPreProjetoParaChat } from "@/lib/pre-projeto-chamado-mensagens";
import { conectarChatPreProjetoTempoReal } from "@/lib/pre-projeto-chat-realtime";
import {
  abrirOutlookComposeAgendamentoTecnico,
  copiarCorpoConviteOutlookAgendamentoTecnico,
  DURACAO_REUNIAO_ARTHUR_SABOYA_MS,
} from "@/lib/outlook-agendamento-teams";
import {
  EMAIL_SABOYA_ATENDIMENTO,
  montarAssuntoReuniaoArthurSaboya,
} from "@/lib/reuniao-teams-titulos";
import { formatarDataHoraSaoPaulo, instanteUtcRealDesdeDataHoraApi } from "@/lib/date-time";
import type { ISolicitacaoPreProjetoArthurSaboyaDetalhe } from "@/types/solicitacao-pre-projeto-arthur-saboya";
import type { ICoordenadoria } from "@/types/coordenadoria";

const LISTA_PATH = "/pedidos-pre-projetos-arthur-saboya";

function rotuloStatus(s: ISolicitacaoPreProjetoArthurSaboyaDetalhe["status"]) {
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

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-widest text-[#64748B]">
        {label}
      </dt>
      <dd className="text-[13.5px] font-medium leading-snug text-[#0F172A]">
        {children}
      </dd>
    </div>
  );
}

const CHIP_CONFIGS: Record<string, { bg: string; text: string; dot: string }> =
  {
    SOLICITADO: { bg: "#EAF0FB", text: "#0A328D", dot: "#0A328D" },
    RESPONDIDO: { bg: "#EDF7F5", text: "#0f8578", dot: "#5CC9BD" },
    AGUARDANDO_DATA: { bg: "#FDF3EB", text: "#a94a08", dot: "#E56E14" },
    AGENDAMENTO_CRIADO: { bg: "#F3F0FB", text: "#4a2098", dot: "#7c3aed" },
  };

const HORA_INICIO_FUNCIONAMENTO = 13;
const HORA_FIM_FUNCIONAMENTO = 17;

const HORARIOS_MEIA_HORA = Array.from(
  { length: (HORA_FIM_FUNCIONAMENTO - HORA_INICIO_FUNCIONAMENTO) * 2 + 1 },
  (_, i) => {
    const hora = String(HORA_INICIO_FUNCIONAMENTO + Math.floor(i / 2)).padStart(
      2,
      "0",
    );
    const minuto = i % 2 === 0 ? "00" : "30";
    return `${hora}:${minuto}`;
  },
);

function formatarParaInputDataHora(valor?: string | Date | null) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const yyyy = String(data.getFullYear());
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  const hh = String(data.getHours()).padStart(2, "0");
  const mi = String(data.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function StatusChip({
  status,
}: {
  status: ISolicitacaoPreProjetoArthurSaboyaDetalhe["status"];
}) {
  const cfg = CHIP_CONFIGS[status] ?? {
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

export default function ChamadoPreProjetoPortalView({
  referenciaChamado,
}: {
  /** UUID (links antigos) ou protocolo exibido (`PP-…`), como na URL. */
  referenciaChamado: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.access_token;
  const divisaoArthurPadrao =
    process.env.NEXT_PUBLIC_DIVISAO_ID_PRE_PROJETOS?.trim();

  const [chamado, setChamado] =
    useState<ISolicitacaoPreProjetoArthurSaboyaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoChat, setEnviandoChat] = useState(false);

  const [confirmAberto, setConfirmAberto] = useState(false);
  const [agendarAberto, setAgendarAberto] = useState(false);
  const [dataHoraAgendamento, setDataHoraAgendamento] = useState("");
  const [coordenadoriaAgendamento, setCoordenadoriaAgendamento] = useState("");
  const [tecnicoArthurIdAgendamento, setTecnicoArthurIdAgendamento] =
    useState("");
  const [listaCoord, setListaCoord] = useState<ICoordenadoria[]>([]);
  const [tecnicosArthur, setTecnicosArthur] = useState<ITecnico[]>([]);
  const [atribuirCoordAberto, setAtribuirCoordAberto] = useState(false);
  const [tecnicosCoordenadoria, setTecnicosCoordenadoria] = useState<
    ITecnico[]
  >([]);
  const [tecnicoCoordenadoriaId, setTecnicoCoordenadoriaId] = useState("");
  const [coordenadoriaUsuarioId, setCoordenadoriaUsuarioId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [agendamentoIdParaConfirmarOutlook, setAgendamentoIdParaConfirmarOutlook] = useState<string | null>(null);
  const [confirmandoOutlook, setConfirmandoOutlook] = useState(false);
  const [falhaTeamsMensagem, setFalhaTeamsMensagem] = useState<string | null>(null);
  const [assuntoOutlookFallback, setAssuntoOutlookFallback] = useState("");
  const carregandoRealtimeRef = useRef(false);

  const mensagensChat = useMemo(
    () => (chamado ? mensagensPreProjetoParaChat(chamado) : []),
    [chamado],
  );

  const carregarChamado = useCallback(async () => {
    if (!token || !referenciaChamado) return;
    setCarregando(true);
    setErro(null);
    const r = await agendamento.obterChamadoPortalArthurSaboya(
      token,
      referenciaChamado,
    );
    if (!r.ok || !r.data) {
      setErro(r.error ?? "Chamado não encontrado ou sem permissão.");
      setChamado(null);
      setCarregando(false);
      return;
    }
    setChamado(r.data);
    setCarregando(false);
  }, [token, referenciaChamado]);

  useEffect(() => {
    if (status === "loading" || !token) return;
    void carregarChamado();
  }, [status, token, carregarChamado]);

  useEffect(() => {
    if (status === "loading" || !token || !referenciaChamado) return;
    const socket = conectarChatPreProjetoTempoReal(referenciaChamado, () => {
      if (carregandoRealtimeRef.current) return;
      carregandoRealtimeRef.current = true;
      void carregarChamado().finally(() => {
        carregandoRealtimeRef.current = false;
      });
    });
    return () => {
      socket?.disconnect();
    };
  }, [status, token, referenciaChamado, carregarChamado]);

  useEffect(() => {
    if (!token || status === "loading") return;
    void (async () => {
      const r = await coordenadorias.listaCompleta();
      if (r.ok && Array.isArray(r.data)) {
        setListaCoord((r.data as ICoordenadoria[]).filter((c) => c.status));
      }
    })();
  }, [token, status]);

  const carregarTecnicosArthur = useCallback(async () => {
    if (!token || status === "loading") return;
    const rArthur = await usuario.buscarTecnicosArthurSaboya();
    if (rArthur.ok && Array.isArray(rArthur.data)) {
      setTecnicosArthur(rArthur.data as ITecnico[]);
      return;
    }
    setTecnicosArthur([]);
  }, [token, status]);

  useEffect(() => {
    void carregarTecnicosArthur();
  }, [carregarTecnicosArthur]);

  useEffect(() => {
    if (!token || status === "loading") return;
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
  }, [token, status, session?.usuario]);

  useEffect(() => {
    if (!token || status === "loading" || !atribuirCoordAberto) return;
    const coordId = chamado?.coordenadoriaId?.trim();
    if (!coordId) {
      setTecnicosCoordenadoria([]);
      return;
    }
    void (async () => {
      const r = await usuario.buscarTecnicosPorCoordenadoria(coordId);
      if (r.ok && Array.isArray(r.data)) {
        setTecnicosCoordenadoria(r.data as ITecnico[]);
      } else {
        setTecnicosCoordenadoria([]);
      }
    })();
  }, [token, status, atribuirCoordAberto, chamado?.coordenadoriaId]);

  const handleEnviarMensagem = async (texto: string) => {
    if (!token) return;
    setEnviandoChat(true);
    const ref = chamado?.protocolo ?? referenciaChamado;
    const r = await agendamento.enviarMensagemChamadoPortalArthurSaboya(
      token,
      ref,
      texto,
    );
    setEnviandoChat(false);
    if (!r.ok || !r.data) {
      toast.error(r.error ?? "Não foi possível enviar a mensagem.");
      return;
    }
    setChamado(r.data);
    toast.success("Mensagem registrada.");
  };

  const handleConfirmarRespondido = async () => {
    if (!token || !chamado) return;
    setSalvando(true);
    const res = await agendamento.confirmarRespostaEnviadaPortalArthurSaboya(
      token,
      chamado.protocolo,
    );
    setSalvando(false);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível atualizar o status.");
      return;
    }
    toast.success("Status atualizado para Solucionado.");
    setConfirmAberto(false);
    void carregarChamado();
  };

  const abrirAgendar = () => {
    if (!chamado) return;
    if (tecnicosArthur.length === 0) {
      void carregarTecnicosArthur();
    }
    setDataHoraAgendamento(formatarParaInputDataHora(chamado.dataAgendamento));
    setCoordenadoriaAgendamento(chamado.coordenadoriaId ?? "");
    setTecnicoArthurIdAgendamento(chamado.tecnicoArthurId ?? "");
    setAgendarAberto(true);
  };

  const dataAgendamento = dataHoraAgendamento
    ? dataHoraAgendamento.slice(0, 10)
    : "";
  const horaAgendamento = dataHoraAgendamento
    ? dataHoraAgendamento.slice(11, 16)
    : "";

  const handleDataAgendamentoChange = (novaData: string) => {
    if (!novaData) {
      setDataHoraAgendamento("");
      return;
    }
    const hora = HORARIOS_MEIA_HORA.includes(horaAgendamento)
      ? horaAgendamento
      : "13:00";
    setDataHoraAgendamento(`${novaData}T${hora}`);
  };

  const handleHoraAgendamentoChange = (novaHora: string) => {
    if (!dataAgendamento || !HORARIOS_MEIA_HORA.includes(novaHora)) return;
    setDataHoraAgendamento(`${dataAgendamento}T${novaHora}`);
  };

  const handleCriarAgendamento = async () => {
    if (!token || !chamado) return;
    if (!dataHoraAgendamento.trim()) {
      toast.error("Informe data e hora do agendamento.");
      return;
    }
    if (!coordenadoriaAgendamento) {
      toast.error("Selecione a coordenadoria.");
      return;
    }
    if (!tecnicoArthurIdAgendamento) {
      toast.error("Selecione o técnico da Sala Arthur Saboya.");
      return;
    }
    const dataSelecionada = new Date(dataHoraAgendamento);
    const minuto = dataSelecionada.getMinutes();
    if (
      Number.isNaN(dataSelecionada.getTime()) ||
      (minuto !== 0 && minuto !== 30)
    ) {
      toast.error("Selecione um horário com minutos 00 ou 30.");
      return;
    }
    setSalvando(true);
    const iso = dataSelecionada.toISOString();
    const res =
      await agendamento.criarAgendamentoDaSolicitacaoPortalArthurSaboya(
        token,
        chamado.protocolo,
        {
          dataHora: iso,
          coordenadoriaId: coordenadoriaAgendamento,
          tecnicoId: tecnicoArthurIdAgendamento,
        },
      );
    setSalvando(false);
    if (!res.ok) {
      toast.error(
        res.error ??
          (chamado.status === "AGENDAMENTO_CRIADO"
            ? "Falha ao atualizar técnico da Sala Arthur Saboya."
            : "Falha ao enviar à coordenadoria."),
      );
      return;
    }
    toast.success(
      chamado.status === "AGENDAMENTO_CRIADO"
        ? "Técnico da Sala Arthur Saboya atualizado."
        : "Solicitação enviada para a coordenadoria. Aguardando confirmação de data/hora.",
    );
    setAgendarAberto(false);
    void carregarChamado();
  };

  const abrirAtribuirTecnicoCoordenadoria = () => {
    setTecnicoCoordenadoriaId("");
    setAtribuirCoordAberto(true);
  };

  const handleConfirmarAgendadoOutlook = async (confirmado: boolean) => {
    if (confirmado && agendamentoIdParaConfirmarOutlook) {
      setConfirmandoOutlook(true);
      try {
        const res = await agendamento.atualizar(
          agendamentoIdParaConfirmarOutlook,
          { status: StatusAgendamento.AGENDADO },
        );
        if (res.ok) {
          toast.success("Agendamento confirmado.");
          void carregarChamado();
        } else {
          toast.error(res.error ?? "Não foi possível confirmar o agendamento.");
        }
      } finally {
        setConfirmandoOutlook(false);
      }
    }
    setAgendamentoIdParaConfirmarOutlook(null);
    setFalhaTeamsMensagem(null);
    setAssuntoOutlookFallback("");
  };

  const abrirOutlookFallback = () => {
    if (!chamado) return;
    const emailCoordenadoria = (
      listaCoord.find((c) => c.id === chamado.coordenadoriaId)?.email ||
      chamado.emailContatoDivisao ||
      ""
    ).trim();
    const tecnicoSelecionado = tecnicosCoordenadoria.find(
      (t) => t.id === tecnicoCoordenadoriaId,
    );
    const emailTecnico = (tecnicoSelecionado?.email || chamado.emailTecnicoCoordenadoria || "").trim();
    const emailMunicipe = (chamado.email || "").trim();
    const emailTecnicoArthur = (chamado.tecnicoArthurEmail || "").trim();
    const dataBase = chamado.dataAgendamento
      ? instanteUtcRealDesdeDataHoraApi(chamado.dataAgendamento)
      : null;
    if (!emailCoordenadoria || !dataBase || Number.isNaN(dataBase.getTime())) {
      toast.error("Não foi possível abrir o Outlook: dados incompletos.");
      return;
    }
    const dataHoraAtendimentoBrasilia = formatarDataHoraSaoPaulo(
      chamado.dataAgendamento!,
      true,
    );
    copiarCorpoConviteOutlookAgendamentoTecnico(dataHoraAtendimentoBrasilia);
    abrirOutlookComposeAgendamentoTecnico({
      emailOrganizadorCoordenadoria: emailCoordenadoria,
      assunto:
        assuntoOutlookFallback ||
        montarAssuntoReuniaoArthurSaboya(chamado.protocolo),
      inicioIso: dataBase.toISOString(),
      fimIso: new Date(
        dataBase.getTime() + DURACAO_REUNIAO_ARTHUR_SABOYA_MS,
      ).toISOString(),
      dataHoraAtendimentoBrasilia,
      corpoViaAreaTransferencia: true,
      emailsParticipantes: [
        emailMunicipe,
        emailTecnico,
        emailTecnicoArthur,
        emailCoordenadoria,
        EMAIL_SABOYA_ATENDIMENTO,
      ],
    });
    toast.info("Texto das condições copiado", {
      description: "Cole no corpo do convite ao abrir o Outlook (Ctrl+V).",
    });
  };

  const handleConfirmarEAgendar = async () => {
    if (!token || !chamado) return;
    if (!tecnicoCoordenadoriaId) {
      toast.error("Selecione o técnico da coordenadoria.");
      return;
    }

    const tecnicoSelecionado = tecnicosCoordenadoria.find(
      (t) => t.id === tecnicoCoordenadoriaId,
    );
    const emailTecnico = (tecnicoSelecionado?.email || "").trim();
    if (!emailTecnico) {
      toast.error("E-mail do técnico da coordenadoria não encontrado.");
      return;
    }

    const emailCoordenadoria = (
      listaCoord.find((c) => c.id === chamado.coordenadoriaId)?.email ||
      chamado.emailContatoDivisao ||
      ""
    ).trim();
    if (!emailCoordenadoria) {
      toast.error("E-mail da coordenadoria não cadastrado.");
      return;
    }

    const emailMunicipe = (chamado.email || "").trim();
    if (!emailMunicipe) {
      toast.error("E-mail do munícipe não cadastrado.");
      return;
    }
    const emailTecnicoArthur = (chamado.tecnicoArthurEmail || "").trim();
    if (!emailTecnicoArthur) {
      toast.error("E-mail do técnico da Sala Arthur Saboya não encontrado.");
      return;
    }

    const dataBase = chamado.dataAgendamento
      ? instanteUtcRealDesdeDataHoraApi(chamado.dataAgendamento)
      : null;
    if (!dataBase || Number.isNaN(dataBase.getTime())) {
      toast.error("Data/hora do agendamento não está definida.");
      return;
    }

    const assunto = montarAssuntoReuniaoArthurSaboya(chamado.protocolo);

    setSalvando(true);
    const res =
      await agendamento.atribuirTecnicoCoordenadoriaSolicitacaoPortalArthurSaboya(
        token,
        chamado.protocolo,
        { tecnicoId: tecnicoCoordenadoriaId },
      );
    if (!res.ok) {
      setSalvando(false);
      toast.error(res.error ?? "Falha ao confirmar agendamento.");
      return;
    }

    const agendamentoId = res.data?.agendamentoId ?? null;
    if (!agendamentoId) {
      setSalvando(false);
      toast.error("Agendamento criado, mas sem identificador para a reunião Teams.");
      return;
    }

    const teams = await agendamento.agendarReuniaoTeams(agendamentoId);
    setSalvando(false);
    setAtribuirCoordAberto(false);

    if (teams.ok) {
      toast.success("Reunião Teams criada", {
        description:
          "O convite foi enviado ao técnico, ao munícipe, à coordenadoria e à Sala Arthur Saboya.",
      });
      void carregarChamado();
      return;
    }

    toast.warning("Não foi possível criar a reunião automaticamente", {
      description:
        teams.error ||
        "Os pontos focais foram avisados. Use o Outlook como alternativa.",
    });
    setAssuntoOutlookFallback(assunto);
    setFalhaTeamsMensagem(
      teams.error || "Falha ao criar a reunião no Microsoft Teams.",
    );
    setAgendamentoIdParaConfirmarOutlook(agendamentoId);
    void carregarChamado();
  };

  if (status === "loading" || !token) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        {status === "loading" ? "Carregando sessão…" : "Sessão indisponível."}
      </div>
    );
  }

  const protocoloExibicao = chamado?.protocolo ?? referenciaChamado;
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
  const divisaoArthur = divisaoArthurPadrao;
  const isDevRealOuEfetivo =
    permissaoUsuario === "DEV" || permissaoReal === "DEV";
  const isAdmRealOuEfetivo =
    permissaoUsuario === "ADM" || permissaoReal === "ADM";
  const isTecAs =
    permissaoUsuario === "ARTHUR_SABOYA" ||
    permissaoUsuario === "TEC_AS" ||
    (permissaoUsuario === "TEC" &&
      !!divisaoArthur &&
      !!divisaoUsuario &&
      divisaoUsuario === divisaoArthur);
  const usuarioArthur =
    isTecAs ||
    isDevRealOuEfetivo ||
    isAdmRealOuEfetivo ||
    (permissaoUsuario === "PONTO_FOCAL" &&
      !!divisaoArthur &&
      !!divisaoUsuario &&
      divisaoUsuario === divisaoArthur);
  const tecnicoArthurPodeEnviarMensagem =
    isTecAs || isDevRealOuEfetivo || isAdmRealOuEfetivo;
  const usuarioPodeAtribuirCoordenadoria =
    permissaoUsuario === "COORDENADOR" ||
    (permissaoUsuario === "PONTO_FOCAL" && !usuarioArthur) ||
    permissaoUsuario === "ADM" ||
    permissaoUsuario === "DEV";
  const coordRestrito =
    !isDevRealOuEfetivo &&
    (permissaoUsuario === "PONTO_FOCAL" ||
      permissaoUsuario === "COORDENADOR") &&
    !!coordenadoriaUsuarioId &&
    !!chamado?.coordenadoriaId &&
    coordenadoriaUsuarioId !== chamado.coordenadoriaId;

  if (coordRestrito) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#64748B]">
        Você não tem permissão para visualizar este chamado.
      </div>
    );
  }

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-4.5rem)] flex-col bg-[#F6F8FB] text-[#0F172A] antialiased [-webkit-font-smoothing:antialiased]">
      <header className="sticky top-0 z-20 border-b border-[#E5EAF2] bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3.5 sm:px-7">
          <nav
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[13px] text-[#64748B]"
            aria-label="Localização no sistema"
          >
            <Link
              href={LISTA_PATH}
              className="font-medium hover:text-[#0A328D]"
            >
              Sala Arthur Saboya
            </Link>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]"
              aria-hidden
            />
            <Link
              href={LISTA_PATH}
              className="font-medium hover:text-[#0A328D]"
            >
              Pedidos
            </Link>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]"
              aria-hidden
            />
            <span className="font-mono font-semibold tracking-tight text-[#0F172A]">
              {protocoloExibicao}
            </span>
          </nav>
          <div className="shrink-0">
            <ModeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 pb-6 pt-4 sm:px-7 sm:pb-10">
        <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:px-3 sm:text-[13px]"
              onClick={() => router.push(LISTA_PATH)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Lista de pedidos
            </Button>
            <span className="font-mono text-[13px] font-medium text-[#64748B]">
              {protocoloExibicao}
            </span>
            {chamado ? (
              <StatusChip status={chamado.status} />
            ) : (
              <span className="text-[13px] text-[#64748B]">
                Carregando chamado…
              </span>
            )}
          </div>
          {chamado ? (
            <div className="flex w-full flex-wrap justify-end gap-2 sm:ml-auto sm:w-auto">
              {usuarioArthur ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-55 sm:px-3 sm:text-[13px]"
                    disabled={chamado.status !== "SOLICITADO" || salvando}
                    onClick={() => setConfirmAberto(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Marcar solucionado
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 gap-2 rounded-lg border border-transparent bg-[#E56E14] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#c95d0e] disabled:opacity-55 sm:px-3 sm:text-[13px]"
                    disabled={
                      ![
                        "SOLICITADO",
                        "AGUARDANDO_DATA",
                        "AGENDAMENTO_CRIADO",
                      ].includes(chamado.status) || salvando
                    }
                    onClick={abrirAgendar}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {chamado.status === "AGENDAMENTO_CRIADO"
                      ? "Trocar técnico da Sala Arthur"
                      : "Enviar à coordenadoria"}
                  </Button>
                </>
              ) : null}
              {usuarioPodeAtribuirCoordenadoria ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-55 sm:px-3 sm:text-[13px]"
                  disabled={
                    !["AGUARDANDO_DATA", "AGENDAMENTO_CRIADO"].includes(
                      chamado.status,
                    ) || salvando
                  }
                  onClick={abrirAtribuirTecnicoCoordenadoria}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Atribuir técnico da coordenadoria
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 lg:grid-cols-[320px_1fr] lg:gap-5">
          <aside className="flex w-full shrink-0 flex-col lg:w-full">
            <div className="overflow-hidden rounded-[14px] border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-20">
              {chamado && (
                <div className="border-b border-[#E5EAF2] px-5 pb-4 pt-1">
                  <div className="flex items-center gap-3 py-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                      style={{ backgroundColor: "#EDBA94", color: "#0A328D" }}
                    >
                      {chamado.nome
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">
                        {chamado.nome}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#64748B]">
                        <Mail className="h-3 w-3 shrink-0 opacity-80" />
                        {chamado.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-5 py-5">
                {carregando ? (
                  <p className="text-sm text-[#64748B]">Carregando dados…</p>
                ) : erro ? (
                  <p className="text-sm text-destructive">{erro}</p>
                ) : chamado ? (
                  <div className="flex flex-col gap-3.5 text-sm">
                    <dl className="flex flex-col gap-3.5">
                      <InfoItem label="Protocolo">
                        <span className="font-mono text-[12.5px] font-medium tracking-tight text-[#0F172A]">
                          {chamado.protocolo}
                        </span>
                      </InfoItem>
                      <InfoItem label="Abertura">
                        {formatarDataHoraSaoPaulo(chamado.criadoEm, true)}
                      </InfoItem>
                      <InfoItem label="Formação">
                        {chamado.formacaoTexto}
                      </InfoItem>
                      <InfoItem label="Natureza">
                        {chamado.naturezaTexto}
                      </InfoItem>
                    </dl>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <main className="flex min-h-[min(52vh,520px)] min-w-0 flex-col lg:min-h-0 lg:flex-1">
            {carregando ? (
              <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[#E5EAF2] bg-white/60 p-8 text-sm text-[#64748B]">
                Carregando conversa…
              </div>
            ) : chamado ? (
              <PreProjetoChamadoChat
                variante="painel"
                mensagens={mensagensChat}
                onEnviar={handleEnviarMensagem}
                enviando={enviandoChat}
                bloqueado={
                  chamado.status === "RESPONDIDO" ||
                  !tecnicoArthurPodeEnviarMensagem
                }
                placeholderBloqueado={
                  chamado.status === "RESPONDIDO"
                    ? "Este chamado foi solucionado e não aceita novas mensagens."
                    : "Somente o técnico da Sala Arthur Saboya, equipe administrativa autorizada e o munícipe podem enviar mensagens."
                }
                mensagemBloqueado={
                  chamado.status === "RESPONDIDO"
                    ? "Chamado solucionado: envio de mensagens desativado."
                    : "Envio de mensagens indisponível para este perfil neste chamado."
                }
                titulo="Linha do tempo"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[#E5EAF2] p-8 text-sm text-[#64748B]">
                Não foi possível carregar o chamado.
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={confirmAberto} onOpenChange={setConfirmAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar status</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Confirma que a dúvida foi solucionada? O status passa para{" "}
            <strong>Solucionado</strong>.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAberto(false)}
              disabled={salvando}
            >
              Não
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmarRespondido()}
              disabled={salvando}
            >
              Sim, confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={agendarAberto} onOpenChange={setAgendarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {chamado?.status === "AGENDAMENTO_CRIADO"
                ? "Trocar técnico da Sala Arthur Saboya"
                : "Enviar para a coordenadoria"}
            </DialogTitle>
          </DialogHeader>
          {chamado ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Munícipe:</span> {chamado.nome}
              </p>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="dt-ag-full">
                  Data e hora
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    id="dt-ag-full"
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) =>
                      handleDataAgendamentoChange(e.target.value)
                    }
                  />
                  <select
                    id="hr-ag-full"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    value={horaAgendamento}
                    onChange={(e) =>
                      handleHoraAgendamentoChange(e.target.value)
                    }
                    disabled={!dataAgendamento}
                  >
                    <option value="">Selecione</option>
                    {HORARIOS_MEIA_HORA.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="coord-ag-full">
                  Coordenadoria
                </label>
                <select
                  id="coord-ag-full"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={coordenadoriaAgendamento}
                  onChange={(e) => setCoordenadoriaAgendamento(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {listaCoord.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.sigla}
                      {c.nome ? ` — ${c.nome}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="tecnico-arthur-full">
                  Técnico da Sala Arthur Saboya
                </label>
                <select
                  id="tecnico-arthur-full"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={tecnicoArthurIdAgendamento}
                  onChange={(e) =>
                    setTecnicoArthurIdAgendamento(e.target.value)
                  }
                >
                  <option value="">Selecione…</option>
                  {tecnicosArthur.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                      {t.login ? ` (${t.login})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAgendarAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleCriarAgendamento()}
              disabled={salvando}
            >
              {chamado?.status === "AGENDAMENTO_CRIADO"
                ? "Salvar troca"
                : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!agendamentoIdParaConfirmarOutlook}
        onOpenChange={(open) => !open && void handleConfirmarAgendadoOutlook(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reunião automática não criada</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Não foi possível criar a reunião no Teams pela caixa{" "}
              <strong>smuL_agendamento@prefeitura.sp.gov.br</strong>. Os pontos
              focais da coordenadoria foram avisados por e-mail.
            </p>
            {falhaTeamsMensagem ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                {falhaTeamsMensagem}
              </p>
            ) : null}
            <p>
              Título da reunião:{" "}
              <strong>
                {assuntoOutlookFallback ||
                  (chamado
                    ? montarAssuntoReuniaoArthurSaboya(chamado.protocolo)
                    : "—")}
              </strong>
            </p>
            <p>
              Use o Outlook como alternativa e, depois de criar o convite,
              confirme abaixo para marcar o agendamento.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleConfirmarAgendadoOutlook(false)}
              disabled={confirmandoOutlook}
            >
              Fechar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={abrirOutlookFallback}
              disabled={confirmandoOutlook}
            >
              Abrir Outlook (alternativa)
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmarAgendadoOutlook(true)}
              disabled={confirmandoOutlook}
            >
              {confirmandoOutlook ? "Atualizando…" : "Já agendei no Outlook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={atribuirCoordAberto} onOpenChange={setAtribuirCoordAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir técnico da coordenadoria</DialogTitle>
          </DialogHeader>
          {chamado ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Protocolo:</span>{" "}
                {chamado.protocolo}
              </p>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="tecnico-coord-full">
                  Técnico da coordenadoria
                </label>
                <select
                  id="tecnico-coord-full"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={tecnicoCoordenadoriaId}
                  onChange={(e) => setTecnicoCoordenadoriaId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {tecnicosCoordenadoria.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                      {t.login ? ` (${t.login})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAtribuirCoordAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmarEAgendar()}
              disabled={salvando}
            >
              Confirmar e agendar reunião
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
