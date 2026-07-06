"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, MessageSquare, Search } from "lucide-react"
import Link from "next/link"
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer"
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header"
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EVENTO_SESSAO_MUNICIPE,
  encerrarSessaoMunicipe,
  municipeEstaLogado,
  obterTokenMunicipe,
} from "@/lib/municipe-sessao"
import * as agendamento from "@/services/agendamentos"
import type { ISolicitacaoPreProjetoArthurSaboya } from "@/types/solicitacao-pre-projeto-arthur-saboya"
import { formatarDataHoraSaoPaulo } from "@/lib/date-time"

const BASE = "/portal"
const CONSULTA_BASE = "/consulta"

function rotuloStatus(s: ISolicitacaoPreProjetoArthurSaboya["status"]) {
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

export default function ConsultaPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [itens, setItens] = useState<ISolicitacaoPreProjetoArthurSaboya[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const token = obterTokenMunicipe()
    if (!token) return
    setCarregando(true)
    setErro(null)
    const res = await agendamento.listarChamadosPreProjetosMunicipe(token, 1, 50)
    if (!res.ok || !res.data) {
      if (res.status === 401) {
        encerrarSessaoMunicipe()
        return
      }
      setErro(res.error ?? "Não foi possível carregar seus chamados.")
      setItens([])
      setTotal(0)
      setCarregando(false)
      return
    }
    setItens(res.data.data)
    setTotal(res.data.total)
    setCarregando(false)
  }, [])

  useEffect(() => {
    const sync = () => setAutenticado(municipeEstaLogado())
    sync()
    window.addEventListener(EVENTO_SESSAO_MUNICIPE, sync)
    return () => window.removeEventListener(EVENTO_SESSAO_MUNICIPE, sync)
  }, [])

  useEffect(() => {
    if (!autenticado) return
    void carregar()
  }, [autenticado, carregar])

  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner>
        <Link
          href={BASE}
          className="mb-3 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white sm:mb-4"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Voltar ao Início
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E56E14]">
            <Search className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Consultar atendimentos</h1>
            <p className="mt-1 max-w-2xl text-sm leading-snug text-white/90 sm:text-base">
              Consulte seus atendimentos de dúvidas pré-projetos (Sala Arthur Saboya)
            </p>
          </div>
        </div>
      </ArthurSaboyaPageBackgroundBanner>
      <main className="flex-1">
        <section className="bg-[#D1EBE8]/20 py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              {!autenticado ? (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Faça login para consultar</CardTitle>
                    <CardDescription>
                      A lista de chamados fica vinculada à sua conta do portal (e-mail). Use o mesmo
                      e-mail ao abrir um novo pré-projeto para associar automaticamente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/portal/acesso?proxima=%2Fconsulta">Entrar</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/portal/cadastro?proxima=%2Fconsulta">Criar conta</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
              {autenticado ? (
                <Card>
                  <CardHeader className="space-y-2">
                    <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                      <span className="inline-flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 shrink-0 text-[#E56E14]" />
                        <span className="leading-tight">Meus chamados — pré-projetos</span>
                      </span>
                    </CardTitle>
                    <CardDescription className="text-pretty leading-relaxed">
                      Clique em um chamado para abrir e conversar com a equipe (andamentos em formato de
                      chat).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex justify-stretch sm:justify-end">
                      <Button asChild className="w-full sm:w-auto">
                        <Link href="/pre-projetos">Abrir nova solicitação</Link>
                      </Button>
                    </div>
                    {erro ? (
                      <div
                        role="alert"
                        className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                      >
                        {erro}
                      </div>
                    ) : null}

                    {/* Mobile: cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {carregando ? (
                        <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                          Carregando…
                        </div>
                      ) : itens.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                          Nenhum chamado encontrado. Abra um pré-projeto em “Pré-projetos” com o mesmo
                          e-mail da sua conta.
                        </div>
                      ) : (
                        itens.map((row) => (
                          <Link
                            key={row.id}
                            href={`${CONSULTA_BASE}/${row.id}`}
                            className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-[#E56E14]/35 hover:bg-muted/30"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Abertura</p>
                                  <p className="mt-0.5 font-medium text-foreground">
                                    {formatarDataHoraSaoPaulo(row.criadoEm)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                                  <p className="mt-0.5 font-medium text-foreground">{rotuloStatus(row.status)}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-xs font-medium text-muted-foreground">Protocolo</p>
                                  <p className="mt-0.5 break-all font-mono text-sm text-foreground">
                                    {row.protocolo}
                                  </p>
                                </div>
                              </div>
                              <span className="inline-flex w-full items-center justify-center rounded-md bg-secondary px-3 py-2 text-center text-sm font-medium text-secondary-foreground sm:w-auto sm:self-end">
                                Visualizar
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    {/* Desktop: tabela */}
                    <div className="hidden rounded-md border md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Abertura</TableHead>
                            <TableHead>Protocolo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {carregando ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-muted-foreground">
                                Carregando…
                              </TableCell>
                            </TableRow>
                          ) : itens.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-muted-foreground">
                                Nenhum chamado encontrado. Abra um pré-projeto em “Pré-projetos” com o
                                mesmo e-mail da sua conta.
                              </TableCell>
                            </TableRow>
                          ) : (
                            itens.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {formatarDataHoraSaoPaulo(row.criadoEm)}
                                </TableCell>
                                <TableCell className="max-w-[12rem] break-all font-mono text-sm">
                                  {row.protocolo}
                                </TableCell>
                                <TableCell className="text-sm">{rotuloStatus(row.status)}</TableCell>
                                <TableCell className="text-right">
                                  <Button asChild size="sm" variant="secondary">
                                    <Link href={`${CONSULTA_BASE}/${row.id}`}>Visualizar</Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {total > 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">{total} chamado(s) no total.</p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <ArthurSaboyaFooter />
    </div>
  )
}
