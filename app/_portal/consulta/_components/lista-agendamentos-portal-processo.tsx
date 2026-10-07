"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { obterTokenMunicipe } from "@/lib/municipe-sessao"
import { formatarDataHoraSaoPaulo } from "@/lib/date-time"
import {
  rotuloRelacaoInteressado,
  rotuloStatusAgendamentoPortal,
} from "@/lib/portal-processos-constantes"
import * as agendamento from "@/services/agendamentos"
import type { IAgendamento } from "@/types/agendamento"

export function ListaAgendamentosPortalProcesso() {
  const [itens, setItens] = useState<IAgendamento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<IAgendamento | null>(null)
  const [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const token = obterTokenMunicipe()
    if (!token) return
    setCarregando(true)
    setErro(null)
    const res = await agendamento.listarAgendamentosPortalProcesso(token)
    if (!res.ok || !res.data) {
      setErro(res.error ?? "Não foi possível carregar seus agendamentos.")
      setItens([])
    } else {
      setItens(res.data as IAgendamento[])
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function confirmarCancelamento() {
    if (!cancelando) return
    const token = obterTokenMunicipe()
    if (!token) return
    setSalvando(true)
    const res = await agendamento.cancelarAgendamentoPortalProcesso(
      token,
      cancelando.id,
      motivo.trim() || "Cancelado pelo munícipe.",
    )
    setSalvando(false)
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível cancelar.")
      return
    }
    toast.success("Agendamento cancelado.")
    setCancelando(null)
    setMotivo("")
    void carregar()
  }

  function podeCancelar(ag: IAgendamento) {
    return ag.status === "SOLICITADO" || ag.status === "AGENDADO"
  }

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#E56E14]" />
            Processos em trâmite
          </CardTitle>
          <CardDescription>
            Consulte e, se necessário, cancele seus agendamentos de processos. Cancelamentos de
            horários já confirmados exigem 24 horas de antecedência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {erro ? (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:hidden">
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento de processo encontrado.</p>
            ) : (
              itens.map((row) => (
                <div key={row.id} className="rounded-xl border p-4 text-sm">
                  <p className="font-medium">{row.processo || "—"}</p>
                  <p className="text-muted-foreground">{formatarDataHoraSaoPaulo(row.dataHora, true)}</p>
                  <p>{row.tipoAgendamento?.texto}</p>
                  {row.modalidade ? <p>Modalidade: {row.modalidade === "ONLINE" ? "Online" : "Presencial"}</p> : null}
                  <p>{rotuloStatusAgendamentoPortal({ status: row.status, conferenciaCapStatus: row.conferenciaCapStatus })}</p>
                  {row.modalidade === "PRESENCIAL" && row.localAtendimento ? <p>Local: {row.localAtendimento}{row.sala ? ` · Sala: ${row.sala}` : ""}</p> : null}
                  {row.modalidade === "PRESENCIAL" && row.orientacaoAcesso ? <p>{row.orientacaoAcesso}</p> : null}
                  {row.observacaoCap ? (
                    <p className="mt-2 text-amber-800">Resposta da CAP: {row.observacaoCap}</p>
                  ) : null}
                  {row.teamsJoinUrl && row.status === "AGENDADO" ? (
                    <a href={row.teamsJoinUrl} className="mt-2 inline-block text-[#0A328D] underline" target="_blank" rel="noreferrer">
                      Entrar na reunião
                    </a>
                  ) : null}
                  {row.teamsSyncPendente ? <p className="mt-2 text-amber-800">Atualização da reunião pendente.</p> : null}
                  {podeCancelar(row) ? (
                    <Button className="mt-3 w-full" variant="outline" onClick={() => setCancelando(row)}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Relação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">Carregando…</TableCell>
                  </TableRow>
                ) : itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Nenhum agendamento de processo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatarDataHoraSaoPaulo(row.dataHora, true)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.processo || "—"}</TableCell>
                      <TableCell className="max-w-[16rem] text-sm">{row.tipoAgendamento?.texto || "—"}</TableCell>
                      <TableCell className="text-sm">{rotuloRelacaoInteressado(row.relacaoInteressado)}</TableCell>
                      <TableCell className="text-sm">
                        {row.modalidade ? <p>{row.modalidade === "ONLINE" ? "Online" : "Presencial"}</p> : null}
                        {row.modalidade === "PRESENCIAL" && row.localAtendimento ? <p>Local: {row.localAtendimento}{row.sala ? ` · Sala: ${row.sala}` : ""}</p> : null}
                        {row.modalidade === "PRESENCIAL" && row.orientacaoAcesso ? <p>{row.orientacaoAcesso}</p> : null}
                        {rotuloStatusAgendamentoPortal({
                          status: row.status,
                          conferenciaCapStatus: row.conferenciaCapStatus,
                        })}
                        {row.observacaoCap ? (
                          <p className="mt-1 text-xs text-amber-800">{row.observacaoCap}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.teamsSyncPendente ? <span className="mr-2 text-xs text-amber-800">Teams pendente</span> : null}
                        {row.teamsJoinUrl && row.status === "AGENDADO" ? (
                          <Button asChild size="sm" variant="secondary" className="mr-2">
                            <a href={row.teamsJoinUrl} target="_blank" rel="noreferrer">Reunião</a>
                          </Button>
                        ) : null}
                        {podeCancelar(row) ? (
                          <Button size="sm" variant="outline" onClick={() => setCancelando(row)}>
                            Cancelar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe um motivo. Se o horário já tiver sido confirmado, o cancelamento só é permitido com 24 horas de antecedência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-cancel">Motivo</Label>
            <Input
              id="motivo-cancel"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Não poderei comparecer"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={() => void confirmarCancelamento()}>
              {salvando ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
