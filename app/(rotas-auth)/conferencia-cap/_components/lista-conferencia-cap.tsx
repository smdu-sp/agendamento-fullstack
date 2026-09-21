"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AppPageShell } from "@/components/layout/app-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as agendamento from "@/services/agendamentos"
import * as coordenadorias from "@/services/coordenadorias"
import * as divisoes from "@/services/divisoes"
import type { IAgendamento } from "@/types/agendamento"
import type { ICoordenadoria } from "@/types/coordenadoria"
import type { IDivisao } from "@/types/divisao"
import { formatarDataHoraSaoPaulo } from "@/lib/date-time"
import { rotuloRelacaoInteressado } from "@/lib/portal-processos-constantes"

export function ListaConferenciaCap() {
  const [itens, setItens] = useState<IAgendamento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [selecionado, setSelecionado] = useState<IAgendamento | null>(null)
  const [modo, setModo] = useState<"encaminhar" | "recusar" | null>(null)
  const [coords, setCoords] = useState<ICoordenadoria[]>([])
  const [divs, setDivs] = useState<IDivisao[]>([])
  const [coordenadoriaId, setCoordenadoriaId] = useState("")
  const [divisaoId, setDivisaoId] = useState("")
  const [processo, setProcesso] = useState("")
  const [observacao, setObservacao] = useState("")
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const res = await agendamento.listarConferenciaCap()
    if (!res.ok || !res.data) {
      toast.error(res.error ?? "Não foi possível carregar a fila.")
      setItens([])
    } else {
      setItens(res.data as IAgendamento[])
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
    void coordenadorias.listaCompleta().then((r) => {
      if (r.ok && Array.isArray(r.data)) setCoords(r.data as ICoordenadoria[])
    })
  }, [carregar])

  useEffect(() => {
    if (!coordenadoriaId) {
      setDivs([])
      setDivisaoId("")
      return
    }
    void divisoes.listaCompleta(coordenadoriaId).then((r) => {
      if (r.ok && Array.isArray(r.data)) setDivs(r.data as IDivisao[])
      else setDivs([])
    })
  }, [coordenadoriaId])

  function abrir(ag: IAgendamento, acao: "encaminhar" | "recusar") {
    setSelecionado(ag)
    setModo(acao)
    setProcesso(ag.processo ?? "")
    setCoordenadoriaId("")
    setDivisaoId("")
    setObservacao("")
  }

  async function salvar() {
    if (!selecionado || !modo) return
    setSalvando(true)
    if (modo === "encaminhar") {
      if (!coordenadoriaId) {
        toast.error("Selecione a coordenadoria.")
        setSalvando(false)
        return
      }
      const res = await agendamento.encaminharConferenciaCap(selecionado.id, {
        coordenadoriaId,
        divisaoId: divisaoId || null,
        processo,
      })
      if (!res.ok) toast.error(res.error ?? "Falha ao encaminhar.")
      else {
        toast.success("Solicitação encaminhada à coordenadoria.")
        setSelecionado(null)
        setModo(null)
        void carregar()
      }
    } else {
      const res = await agendamento.recusarConferenciaCap(selecionado.id, observacao)
      if (!res.ok) toast.error(res.error ?? "Falha ao registrar.")
      else {
        toast.success("Munícipe informado de que o processo não foi localizado.")
        setSelecionado(null)
        setModo(null)
        void carregar()
      }
    }
    setSalvando(false)
  }

  const coordSelecionada = useMemo(
    () => coords.find((c) => c.id === coordenadoriaId),
    [coords, coordenadoriaId],
  )

  return (
    <AppPageShell
      title="Conferência CAP"
      breadcrumbs={[{ label: "Conferência CAP" }]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Solicitações aguardando análise</CardTitle>
          <CardDescription>
            Pedidos do portal em que o processo não foi localizado na base BI (ou a unidade não foi
            mapeada). Encaminhe à coordenadoria correta ou informe que o processo não foi encontrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Munícipe</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>BI</TableHead>
                  <TableHead>Horário pedido</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">Carregando…</TableCell>
                  </TableRow>
                ) : itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Nenhuma solicitação pendente.
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatarDataHoraSaoPaulo(row.criadoEm, true)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{row.municipe || "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                        <div className="text-xs text-muted-foreground">{row.telefone}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.processo || "—"}</TableCell>
                      <TableCell className="max-w-[14rem] text-sm">
                        {row.tipoAgendamento?.texto || "—"}
                        <div className="text-xs text-muted-foreground">
                          {rotuloRelacaoInteressado(row.relacaoInteressado)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.encontradoNoBi ? "Encontrado" : "Não encontrado"}
                        {row.biComuniqueSe ? " · comunique-se" : ""}
                        {row.biIndeferido ? " · indeferido" : ""}
                        {row.unidadeDespachoBi ? (
                          <div className="text-muted-foreground">{row.unidadeDespachoBi}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatarDataHoraSaoPaulo(row.dataHora, true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => abrir(row, "encaminhar")}>
                            Encaminhar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrir(row, "recusar")}>
                            Não encontrado
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selecionado} onOpenChange={(o) => !o && setSelecionado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modo === "encaminhar" ? "Encaminhar à coordenadoria" : "Processo não localizado"}
            </DialogTitle>
            <DialogDescription>
              {modo === "encaminhar"
                ? "Informe a coordenadoria (e a divisão, se souber) responsável pelo processo."
                : "A resposta será exibida ao munícipe na consulta de agendamentos."}
            </DialogDescription>
          </DialogHeader>

          {modo === "encaminhar" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proc-cap">Número do processo</Label>
                <Input id="proc-cap" value={processo} onChange={(e) => setProcesso(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Coordenadoria</Label>
                <Select value={coordenadoriaId} onValueChange={setCoordenadoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {coords.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.sigla}{c.nome ? ` — ${c.nome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Divisão (opcional)</Label>
                <Select
                  value={divisaoId || "__none__"}
                  onValueChange={(v) => setDivisaoId(v === "__none__" ? "" : v)}
                  disabled={!coordenadoriaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={coordSelecionada ? "Selecione" : "Escolha a coordenadoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {divs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.sigla}{d.nome ? ` — ${d.nome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="obs-cap">Mensagem ao munícipe</Label>
              <Textarea
                id="obs-cap"
                rows={4}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Não localizamos o processo informado. Verifique o número e abra uma nova solicitação."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelecionado(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando} onClick={() => void salvar()}>
              {salvando ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  )
}
