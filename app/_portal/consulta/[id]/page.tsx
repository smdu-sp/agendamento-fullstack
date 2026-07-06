"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Ban, CheckCircle2, ChevronRight, Mail, Star } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer"
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header"
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner"
import { PreProjetoChamadoChat } from "@/components/arthur-saboya/pre-projeto-chamado-chat"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  EVENTO_SESSAO_MUNICIPE,
  municipeEstaLogado,
  obterTokenMunicipe,
} from "@/lib/municipe-sessao"
import { conectarChatPreProjetoTempoReal } from "@/lib/pre-projeto-chat-realtime"
import { mensagensPreProjetoParaChat } from "@/lib/pre-projeto-chamado-mensagens"
import * as agendamento from "@/services/agendamentos"
import type { ISolicitacaoPreProjetoArthurSaboyaDetalhe } from "@/types/solicitacao-pre-projeto-arthur-saboya"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const BASE = "/portal"
const LISTA_PATH = "/consulta"
const PROXIMA_PREFIX = "/consulta"

function rotuloStatus(s: ISolicitacaoPreProjetoArthurSaboyaDetalhe["status"]) {
  switch (s) {
    case "SOLICITADO":
      return "Solicitado"
    case "RESPONDIDO":
      return "Solucionado"
    case "AGUARDANDO_DATA":
      return "Aguardando data"
    case "AGENDAMENTO_CRIADO":
      return "Enviado à coordenadoria"
    default:
      return s
  }
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-widest text-[#64748B]">{label}</dt>
      <dd className="break-words text-[13.5px] font-medium leading-snug text-[#0F172A]">{children}</dd>
    </div>
  )
}

const CHIP_CONFIGS: Record<string, { bg: string; text: string; dot: string }> = {
  SOLICITADO: { bg: "#EAF0FB", text: "#0A328D", dot: "#0A328D" },
  RESPONDIDO: { bg: "#EDF7F5", text: "#0f8578", dot: "#5CC9BD" },
  AGUARDANDO_DATA: { bg: "#FDF3EB", text: "#a94a08", dot: "#E56E14" },
  AGENDAMENTO_CRIADO: { bg: "#F3F0FB", text: "#4a2098", dot: "#7c3aed" },
}

function StatusChip({ status }: { status: ISolicitacaoPreProjetoArthurSaboyaDetalhe["status"] }) {
  const cfg = CHIP_CONFIGS[status] ?? { bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {rotuloStatus(status)}
    </span>
  )
}

export default function ConsultaChamadoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === "string" ? params.id : ""
  const [hidratar, setHidratar] = useState(false)
  const [autenticado, setAutenticado] = useState(false)
  const [chamado, setChamado] = useState<ISolicitacaoPreProjetoArthurSaboyaDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmarSolucaoAberto, setConfirmarSolucaoAberto] = useState(false)
  const [salvandoSolucao, setSalvandoSolucao] = useState(false)
  const [confirmarCancelamentoAberto, setConfirmarCancelamentoAberto] = useState(false)
  const [cancelandoAtendimento, setCancelandoAtendimento] = useState(false)
  const [notaAvaliacao, setNotaAvaliacao] = useState(0)
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("")
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false)
  const carregandoRealtimeRef = useRef(false)

  const mensagensChat = useMemo(
    () => (chamado ? mensagensPreProjetoParaChat(chamado) : []),
    [chamado],
  )

  const carregar = useCallback(async () => {
    const token = obterTokenMunicipe()
    if (!token || !id) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    setErro(null)
    const res = await agendamento.obterChamadoPreProjetosMunicipe(token, id)
    if (!res.ok || !res.data) {
      setErro(res.error ?? "Chamado não encontrado.")
      setChamado(null)
      setCarregando(false)
      return
    }
    setChamado(res.data)
    setCarregando(false)
  }, [id])

  useEffect(() => {
    const sync = () => setAutenticado(municipeEstaLogado())
    sync()
    setHidratar(true)
    window.addEventListener(EVENTO_SESSAO_MUNICIPE, sync)
    return () => window.removeEventListener(EVENTO_SESSAO_MUNICIPE, sync)
  }, [])

  useEffect(() => {
    if (!autenticado || !id) {
      setCarregando(false)
      return
    }
    void carregar()
  }, [autenticado, id, carregar])

  useEffect(() => {
    if (!autenticado || !id) return
    const socket = conectarChatPreProjetoTempoReal(id, () => {
      if (carregandoRealtimeRef.current) return
      carregandoRealtimeRef.current = true
      void carregar().finally(() => {
        carregandoRealtimeRef.current = false
      })
    })
    return () => {
      socket?.disconnect()
    }
  }, [autenticado, id, carregar])

  useEffect(() => {
    if (!chamado) return
    setNotaAvaliacao(chamado.avaliacaoNota ?? 0)
    setComentarioAvaliacao(chamado.avaliacaoComentario ?? "")
  }, [chamado])

  const enviar = async (texto: string) => {
    const token = obterTokenMunicipe()
    if (!token || !id) return
    setEnviando(true)
    const res = await agendamento.enviarMensagemChamadoPreProjetosMunicipe(token, id, texto)
    setEnviando(false)
    if (!res.ok || !res.data) {
      setErro(res.error ?? "Falha ao enviar.")
      return
    }
    setErro(null)
    setChamado(res.data)
  }

  const marcarComoSolucionado = async () => {
    const token = obterTokenMunicipe()
    if (!token || !id) return
    setSalvandoSolucao(true)
    const res = await agendamento.marcarChamadoPreProjetosMunicipeComoSolucionado(token, id)
    setSalvandoSolucao(false)
    if (!res.ok || !res.data) {
      toast.error(res.error ?? "Não foi possível atualizar o status do chamado.")
      return
    }
    setErro(null)
    setChamado(res.data)
    setConfirmarSolucaoAberto(false)
    toast.success("Chamado marcado como solucionado.")
  }

  const cancelarAtendimento = async () => {
    const token = obterTokenMunicipe()
    if (!token || !id) return
    setCancelandoAtendimento(true)
    const res = await agendamento.cancelarAtendimentoChamadoPreProjetosMunicipe(token, id)
    setCancelandoAtendimento(false)
    if (!res.ok || !res.data) {
      toast.error(res.error ?? "Não foi possível cancelar o atendimento.")
      return
    }
    setErro(null)
    setChamado(res.data)
    setConfirmarCancelamentoAberto(false)
    toast.success("Atendimento cancelado com sucesso.")
  }

  const enviarAvaliacao = async () => {
    const token = obterTokenMunicipe()
    if (!token || !id) return
    if (notaAvaliacao < 1 || notaAvaliacao > 5) {
      toast.error("Selecione uma nota de 1 a 5 estrelas.")
      return
    }
    setEnviandoAvaliacao(true)
    const res = await agendamento.avaliarChamadoPreProjetosMunicipe(token, id, {
      nota: notaAvaliacao,
      comentario: comentarioAvaliacao.trim() || undefined,
    })
    setEnviandoAvaliacao(false)
    if (!res.ok || !res.data) {
      toast.error(res.error ?? "Não foi possível registrar a avaliação.")
      return
    }
    setChamado(res.data)
    toast.success("Avaliação enviada. Obrigado pelo feedback!")
  }

  if (!hidratar) {
    return (
      <div className="flex min-h-screen flex-col">
        <ArthurSaboyaHeader />
        <main className="flex flex-1 items-center justify-center bg-[#D1EBE8]/20 px-4">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </main>
        <ArthurSaboyaFooter />
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="flex min-h-screen flex-col">
        <ArthurSaboyaHeader />
        <ArthurSaboyaPageBackgroundBanner>
          <Link
            href={`${BASE}/acesso?proxima=${encodeURIComponent(`${PROXIMA_PREFIX}/${id}`)}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Entrar para ver este chamado
          </Link>
          <h1 className="text-2xl font-bold text-white">Chamado</h1>
        </ArthurSaboyaPageBackgroundBanner>
        <main className="flex-1 bg-[#D1EBE8]/20 py-12">
          <div className="container mx-auto max-w-lg px-4">
            <Card>
              <CardHeader>
                <CardTitle>Login necessário</CardTitle>
                <CardDescription>Autentique-se para ver o histórico e enviar mensagens.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild>
                  <Link href={`${BASE}/acesso?proxima=${encodeURIComponent(`${PROXIMA_PREFIX}/${id}`)}`}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={LISTA_PATH}>Voltar à lista</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <ArthurSaboyaFooter />
      </div>
    )
  }

  const protocoloExibicao = chamado?.protocolo ?? id

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FB] text-[#0F172A]">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner>
        <div className="mx-auto w-full max-w-[1400px]">
          <nav
            className="mb-4 flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-white/85"
            aria-label="Localização no portal"
          >
            <Link href={BASE} className="font-medium transition-colors hover:text-white">
              Início
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <Link href={LISTA_PATH} className="font-medium transition-colors hover:text-white">
              Meus chamados
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="min-w-0 break-all font-mono text-[12px] font-semibold tracking-tight text-white sm:text-[13px]">
              {protocoloExibicao}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => router.push(LISTA_PATH)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à lista
          </button>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <h1 className="min-w-0 break-words text-xl font-bold text-white sm:text-2xl md:text-3xl">
              {chamado ? `Chamado ${chamado.protocolo}` : "Chamado"}
            </h1>
            {chamado ? <StatusChip status={chamado.status} /> : null}
          </div>
          <p className="mt-1 text-sm text-white/90 sm:text-base">Pré-projetos — Sala Arthur Saboya</p>
        </div>
      </ArthurSaboyaPageBackgroundBanner>

      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 sm:px-7 sm:pb-10">
          {erro ? (
            <div
              role="alert"
              className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {erro}
            </div>
          ) : null}

          {chamado ? (
            <div className="mb-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="inline-flex h-auto min-h-9 w-full items-center justify-center gap-2 whitespace-normal rounded-lg border-[#d9e2ef] px-3 py-2 text-center text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:text-[13px]"
                disabled={chamado.status !== "AGENDAMENTO_CRIADO" || cancelandoAtendimento}
                onClick={() => setConfirmarCancelamentoAberto(true)}
              >
                <Ban className="h-3.5 w-3.5 shrink-0" />
                Cancelar atendimento
              </Button>
              <Button
                type="button"
                size="sm"
                className="inline-flex h-auto min-h-9 w-full items-center justify-center gap-2 whitespace-normal rounded-lg bg-[#0A328D] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-[#082a76] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:text-[13px]"
                disabled={chamado.status === "RESPONDIDO" || salvandoSolucao}
                onClick={() => setConfirmarSolucaoAberto(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[20rem] leading-snug sm:max-w-none">
                  <span className="sm:hidden">Marcar como solucionado</span>
                  <span className="hidden sm:inline">Marcar atendimento como solucionado</span>
                </span>
              </Button>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 lg:grid-cols-[320px_1fr] lg:gap-5">
            <aside className="flex w-full shrink-0 flex-col lg:w-full">
              <div className="overflow-hidden rounded-[14px] border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-8">
                {chamado ? (
                  <>
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
                          <p className="break-words text-sm font-semibold text-[#0F172A]">{chamado.nome}</p>
                          <p className="mt-0.5 flex items-start gap-1.5 break-all text-xs text-[#64748B]">
                            <Mail className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
                            {chamado.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-5">
                      <div className="flex flex-col gap-3.5 text-sm">
                        <dl className="flex flex-col gap-3.5">
                          <InfoItem label="Protocolo">
                            <span className="font-mono text-[12.5px] font-medium tracking-tight text-[#0F172A]">
                              {chamado.protocolo}
                            </span>
                          </InfoItem>
                          <InfoItem label="Abertura">
                            {format(new Date(chamado.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </InfoItem>
                          <InfoItem label="Formação">{chamado.formacaoTexto}</InfoItem>
                          <InfoItem label="Natureza">{chamado.naturezaTexto}</InfoItem>
                        </dl>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-5 py-5">
                    <p className="text-sm text-[#64748B]">
                      {carregando ? "Carregando dados…" : "Não foi possível carregar os dados deste chamado."}
                    </p>
                  </div>
                )}
              </div>
            </aside>

            <section className="flex min-h-[min(40vh,380px)] min-w-0 flex-col gap-3 sm:min-h-[min(48vh,480px)] lg:min-h-0 lg:flex-1">
              {carregando ? (
                <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[#E5EAF2] bg-white/60 p-8 text-sm text-[#64748B]">
                  Carregando conversa…
                </div>
              ) : chamado ? (
                <PreProjetoChamadoChat
                  variante="painel"
                  mensagens={mensagensChat}
                  onEnviar={enviar}
                  enviando={enviando}
                  bloqueado={chamado.status === "RESPONDIDO"}
                  perspectiva="municipe"
                  titulo="Linha do tempo"
                  placeholder="Escreva sua mensagem para a equipe da Sala Arthur Saboya…"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[#E5EAF2] p-8 text-sm text-[#64748B]">
                  Não foi possível exibir este chamado.
                </div>
              )}
              {chamado?.status === "RESPONDIDO" ? (
                <div className="rounded-[10px] border border-[#5CC9BD] bg-[#EDF7F5] px-4 py-3 text-sm leading-relaxed text-[#0f6b62] sm:text-[15px]">
                  <p className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Este chamado foi marcado como <strong>solucionado</strong>. Para novas dúvidas o
                      munícipe deve abrir um novo pedido.
                    </span>
                  </p>
                </div>
              ) : null}
              {chamado?.status === "RESPONDIDO" && !chamado.avaliacaoNota ? (
                <div className="rounded-[12px] border border-[#D7DFEA] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    Avalie o atendimento (1 a 5 estrelas)
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const ativo = n <= notaAvaliacao
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNotaAvaliacao(n)}
                          className="rounded-md p-1 transition-colors hover:bg-[#F1F5F9]"
                          aria-label={`Avaliar com ${n} estrela${n > 1 ? "s" : ""}`}
                          disabled={enviandoAvaliacao}
                        >
                          <Star
                            className="h-6 w-6"
                            style={{
                              color: ativo ? "#E56E14" : "#94A3B8",
                              fill: ativo ? "#E56E14" : "transparent",
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-[#64748B]" htmlFor="avaliacao-comentario">
                      Elogio ou reclamação (opcional)
                    </label>
                    <Textarea
                      id="avaliacao-comentario"
                      rows={3}
                      value={comentarioAvaliacao}
                      onChange={(e) => setComentarioAvaliacao(e.target.value)}
                      placeholder="Escreva seu comentário sobre o atendimento..."
                      className="resize-none border-[#D7DFEA] bg-white text-[#0F172A] placeholder:text-[#94A3B8]"
                      disabled={enviandoAvaliacao}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      className="bg-[#0A328D] text-white hover:bg-[#082a76] disabled:opacity-60"
                      onClick={() => void enviarAvaliacao()}
                      disabled={enviandoAvaliacao || notaAvaliacao < 1}
                    >
                      Enviar avaliação
                    </Button>
                  </div>
                </div>
              ) : null}
              {chamado?.avaliacaoNota ? (
                <div className="rounded-[12px] border border-[#D7DFEA] bg-white px-4 py-3 text-sm text-[#334155]">
                  <p className="font-medium text-[#0F172A]">Avaliação registrada</p>
                  <p className="mt-1">
                    Nota: <strong>{chamado.avaliacaoNota}</strong> estrela{chamado.avaliacaoNota > 1 ? "s" : ""}.
                  </p>
                  {chamado.avaliacaoComentario?.trim() ? (
                    <p className="mt-1 text-[#475569]">{chamado.avaliacaoComentario}</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      <ArthurSaboyaFooter />

      <Dialog open={confirmarSolucaoAberto} onOpenChange={setConfirmarSolucaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar encerramento do chamado</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Ao confirmar, este atendimento será marcado como <strong>solucionado</strong>.
            Caso tenha novas dúvidas, será necessário abrir um novo pedido.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmarSolucaoAberto(false)}
              disabled={salvandoSolucao}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#0A328D] text-white hover:bg-[#082a76]"
              onClick={() => void marcarComoSolucionado()}
              disabled={salvandoSolucao}
            >
              Sim, marcar solucionado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarCancelamentoAberto} onOpenChange={setConfirmarCancelamentoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar atendimento agendado</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Ao confirmar, o atendimento será cancelado e a equipe da Sala Arthur Saboya será notificada por e-mail.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmarCancelamentoAberto(false)}
              disabled={cancelandoAtendimento}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="bg-[#0A328D] text-white hover:bg-[#082a76]"
              onClick={() => void cancelarAtendimento()}
              disabled={cancelandoAtendimento}
            >
              Sim, cancelar atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
