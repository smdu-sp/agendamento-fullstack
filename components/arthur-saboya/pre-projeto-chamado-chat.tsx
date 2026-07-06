"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatarDataHoraSaoPaulo } from "@/lib/date-time"
import type {
  AutorMensagemPreProjetoArthurSaboya,
  IMensagemPreProjetoArthurSaboya,
} from "@/types/solicitacao-pre-projeto-arthur-saboya"

function alinhamento(
  autor: AutorMensagemPreProjetoArthurSaboya,
  perspectiva: "tecnico" | "municipe",
): "left" | "right" | "center" {
  if (autor === "MUNICIPE") return perspectiva === "municipe" ? "right" : "left"
  if (autor === "PONTO_FOCAL") return perspectiva === "municipe" ? "left" : "right"
  return "center"
}

function iniciais(nome: string | null | undefined, fallback = "?") {
  if (!nome) return fallback
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("")
}

function renderTextoComNegrito(texto: string) {
  const partes = String(texto ?? "").split(/(\[b\][\s\S]*?\[\/b\])/g)
  return partes.map((parte, index) => {
    const match = parte.match(/^\[b\]([\s\S]*?)\[\/b\]$/)
    if (!match) return <span key={index}>{parte}</span>
    return <strong key={index}>{match[1]}</strong>
  })
}

export function PreProjetoChamadoChat({
  mensagens,
  onEnviar,
  enviando,
  bloqueado = false,
  placeholder = "Escreva a resposta ao munícipe (registrada no chamado)…",
  placeholderBloqueado = "Este chamado foi solucionado e não aceita novas mensagens.",
  mensagemBloqueado = "Chamado solucionado: envio de mensagens desativado.",
  titulo = "Linha do tempo",
  variante = "card",
  perspectiva = "tecnico",
}: {
  mensagens: IMensagemPreProjetoArthurSaboya[]
  onEnviar: (texto: string) => void | Promise<void>
  enviando?: boolean
  bloqueado?: boolean
  placeholder?: string
  placeholderBloqueado?: string
  mensagemBloqueado?: string
  titulo?: string
  variante?: "card" | "painel"
  perspectiva?: "tecnico" | "municipe"
}) {
  const [texto, setTexto] = useState("")
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens])

  const submit = async () => {
    const t = texto.trim()
    if (!t || enviando || bloqueado) return
    setTexto("")
    await onEnviar(t)
  }

  const painel = variante === "painel"

  return (
    <div
      className={cn(
        "flex flex-col bg-white",
        painel
          ? "min-h-0 flex-1 overflow-hidden rounded-[14px] border border-[#E5EAF2] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          : "gap-3 rounded-lg border border-border shadow-none",
      )}
    >
      {/* Header — alinhado ao .card-head do protótipo */}
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2 border-b border-[#E5EAF2] sm:flex-row sm:items-start sm:justify-between sm:gap-3",
          painel ? "px-4 py-3 sm:px-5 sm:py-4" : "border-border px-4 py-3 sm:px-5 sm:py-4",
        )}
      >
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-semibold text-[#0F172A]",
              painel ? "m-0 text-[13px] leading-tight sm:text-[14px]" : "text-sm",
            )}
          >
            {titulo}
          </h3>
          <p
            className={cn(
              painel
                ? "mt-0.5 text-[12px] font-normal leading-snug text-[#64748B] sm:text-[12.5px]"
                : "text-xs text-muted-foreground",
            )}
          >
            Histórico completo do chamado — respostas e alterações de status.
          </p>
        </div>
        {mensagens.length > 0 && (
          <span
            className={cn(
              "shrink-0 self-start text-[#64748B] sm:self-auto",
              painel ? "text-xs" : "text-xs text-muted-foreground",
            )}
          >
            {mensagens.length} interaç{mensagens.length === 1 ? "ão" : "ões"}
          </span>
        )}
      </div>

      {/* Timeline — .timeline do protótipo */}
      <div
        className={cn(
          "overflow-y-auto",
          painel
            ? "flex min-h-0 flex-1 flex-col gap-3 p-4 sm:gap-[18px] sm:p-5"
            : "max-h-[min(420px,50vh)] space-y-4 px-5 py-4",
        )}
      >
        {mensagens.length === 0 ? (
          <p
            className={cn(
              "text-center text-sm text-[#64748B]",
              painel ? "py-8" : "py-8 text-muted-foreground",
            )}
          >
            Nenhuma mensagem ainda.
          </p>
        ) : (
          mensagens.map((m) => {
            const pos = alinhamento(m.autor, perspectiva)
            const isCentro = pos === "center"

            if (isCentro) {
              return painel ? (
                <div
                  key={m.id}
                  className="flex flex-col items-stretch gap-2 py-1 text-xs text-[#64748B] sm:flex-row sm:items-center sm:gap-2.5"
                >
                  <span className="hidden h-px bg-[#E5EAF2] sm:block sm:flex-1" />
                  <span
                    className="mx-auto max-w-full rounded-[10px] border border-dashed px-3 py-2 text-center text-[11.5px] italic leading-snug sm:max-w-[min(100%,520px)] sm:text-[12.5px]"
                    style={{ borderColor: "#5CC9BD", backgroundColor: "#EDF7F5", color: "#0f6b62" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    </span>{" "}
                    <span className="wrap-break-word">{renderTextoComNegrito(m.corpo)}</span>
                    {" · "}
                    {formatarDataHoraSaoPaulo(m.criadoEm)}
                  </span>
                  <span className="hidden h-px bg-[#E5EAF2] sm:block sm:flex-1" />
                </div>
              ) : (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-[11px] italic text-muted-foreground"
                    style={{ borderColor: "#5CC9BD", backgroundColor: "#EDF7F5", color: "#0f8578" }}
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {renderTextoComNegrito(m.corpo)}
                    {" · "}
                    {formatarDataHoraSaoPaulo(m.criadoEm)}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )
            }

            const isOutgoing = pos === "right"
            const nome = m.nomeRemetente ?? (m.autor === "MUNICIPE" ? "Munícipe" : "Arthur Saboya")
            const ini = iniciais(nome)

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5 sm:gap-3",
                  isOutgoing ? "ml-auto flex-row-reverse" : "flex-row",
                  painel ? "max-w-[min(92%,20rem)] items-start sm:max-w-[78%]" : "max-w-[80%] items-end gap-2.5",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full font-bold",
                    painel ? "h-8 w-8 text-xs" : "h-8 w-8 text-[11px]",
                  )}
                  style={
                    isOutgoing
                      ? { backgroundColor: "#0A328D", color: "#fff" }
                      : { backgroundColor: "#EDBA94", color: "#0A328D" }
                  }
                >
                  {ini}
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-[#64748B]",
                      isOutgoing ? "justify-end" : "justify-start",
                    )}
                  >
                    <span className="font-semibold text-[#334155]">{nome}</span>
                    <span>·</span>
                    <span>{formatarDataHoraSaoPaulo(m.criadoEm)}</span>
                  </div>
                  <div
                    className={cn(
                      "text-[13.5px] leading-normal text-[#0F172A] wrap-anywhere",
                      painel
                        ? isOutgoing
                          ? "rounded-[12px] rounded-tr-[4px] px-[14px] py-2.5 text-white"
                          : "rounded-[12px] rounded-tl-[4px] bg-[#F1F5F9] px-[14px] py-2.5"
                        : cn(
                            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            isOutgoing ? "rounded-tr-sm" : "rounded-tl-sm",
                          ),
                    )}
                    style={
                      painel
                        ? isOutgoing
                          ? { backgroundColor: "#0A328D", color: "#fff" }
                          : {}
                        : isOutgoing
                          ? { backgroundColor: "#0A328D", color: "#fff" }
                          : { backgroundColor: "#F1F5F9", color: "#0F172A" }
                    }
                  >
                    <p className="whitespace-pre-wrap">{renderTextoComNegrito(m.corpo)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={fimRef} />
      </div>

      {/* Composer — .composer do protótipo */}
      <div
        className={cn(
          "shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4",
          painel ? "border-[#E5EAF2] bg-[#F8FAFC]" : "border-border bg-muted/20",
        )}
      >
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={bloqueado ? placeholderBloqueado : placeholder}
          rows={painel ? 2 : 3}
          className={cn(
            "resize-none bg-white text-[#0F172A] transition-[border-color,box-shadow] placeholder:text-[#94A3B8] focus-visible:border-[#0A328D] focus-visible:ring-[3px] focus-visible:ring-[rgba(10,50,141,0.12)]",
            painel
              ? "mb-2.5 min-h-[72px] rounded-lg border border-[#D7DFEA] px-3 py-2.5 text-inherit shadow-none"
              : "mb-3",
          )}
          disabled={enviando || bloqueado}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <div
          className={cn(
            "flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
            painel ? "mt-2.5" : "gap-3",
          )}
        >
          <span className="order-2 text-center text-[11px] text-[#64748B] sm:order-1 sm:text-left sm:text-xs">
            {bloqueado ? mensagemBloqueado : "Ctrl/⌘ + Enter para enviar"}
          </span>
          <Button
            type="button"
            className={cn(
              "order-1 w-full gap-2 rounded-lg border border-transparent bg-[#E56E14] px-[14px] py-2 text-[13px] font-semibold text-white hover:bg-[#c95d0e] sm:order-2 sm:w-auto",
              painel && "sm:h-9",
            )}
            disabled={enviando || bloqueado || !texto.trim()}
            onClick={() => void submit()}
          >
            <Send className="h-4 w-4 shrink-0" />
            Enviar resposta
          </Button>
        </div>
      </div>
    </div>
  )
}
