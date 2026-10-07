"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, Phone, User } from "lucide-react"
import { toast } from "sonner"
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer"
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header"
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import {
  EVENTO_SESSAO_MUNICIPE,
  municipeEstaLogado,
  obterEmailMunicipe,
  obterNomeMunicipe,
  obterTokenMunicipe,
} from "@/lib/municipe-sessao"
import {
  RELACOES_INTERESSADO,
  TIPOS_AGENDAMENTO_PORTAL_PROCESSO,
  mascararCpfInput,
  mascararTelefoneInput,
  rotuloRelacaoInteressado,
  somenteDigitos,
  type RelacaoInteressadoValor,
} from "@/lib/portal-processos-constantes"
import { validaCPF_CNPJ } from "@/lib/utils"
import * as agendamento from "@/services/agendamentos"
import type { OcorrenciaBi } from "@/lib/bi-processos"
import { formatarDataHoraSaoPaulo } from "@/lib/date-time"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

const BASE = "/portal"

type Passo = 1 | 2 | 3

function formatarDataBr(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(data.getDate())}/${pad(data.getMonth() + 1)}/${data.getFullYear()}`
}

function dataIsoLocal(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

function partesAgoraSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { ano: get("year"), mes: get("month"), dia: get("day"), hora: get("hour"), minuto: get("minute") }
}

export function FormAgendamentoProcesso() {
  const [autenticado, setAutenticado] = useState(false)
  const [passo, setPasso] = useState<Passo>(1)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  const [processo, setProcesso] = useState("")
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaBi[]>([])
  const [ocorrenciaId, setOcorrenciaId] = useState("")
  const [tipoTexto, setTipoTexto] = useState("")
  const [modalidade, setModalidade] = useState<"PRESENCIAL" | "ONLINE" | "">("")
  const [duvidaAtendimento, setDuvidaAtendimento] = useState("")
  const [relacao, setRelacao] = useState<RelacaoInteressadoValor | "">("")
  const [dataSel, setDataSel] = useState<Date | undefined>()
  const [horaSel, setHoraSel] = useState("")
  const [horariosAgenda, setHorariosAgenda] = useState<string[] | null>(null)
  const [horariosReserva, setHorariosReserva] = useState<string[]>([])
  const [tipoHorario, setTipoHorario] = useState<"AGENDA" | "PREFERENCIA">("PREFERENCIA")
  const [consultandoHorarios, setConsultandoHorarios] = useState(false)
  const [validando, setValidando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [mensagemDialogo, setMensagemDialogo] = useState("")
  const [confirmadoAusente, setConfirmadoAusente] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [resumoEnvio, setResumoEnvio] = useState<{
    conferencia: boolean
    reserva?: boolean
    coordenadoria?: string | null
    dataHora?: string
  } | null>(null)

  useEffect(() => {
    const sync = () => setAutenticado(municipeEstaLogado())
    sync()
    window.addEventListener(EVENTO_SESSAO_MUNICIPE, sync)
    return () => window.removeEventListener(EVENTO_SESSAO_MUNICIPE, sync)
  }, [])

  useEffect(() => {
    if (!autenticado) return
    setNome(obterNomeMunicipe() ?? "")
    setEmail(obterEmailMunicipe() ?? "")
  }, [autenticado])

  useEffect(() => {
    if (!dataSel || !ocorrenciaId || !modalidade || tipoTexto !== TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto) {
      setHorariosAgenda(null)
      setHorariosReserva([])
      setTipoHorario("PREFERENCIA")
      return
    }
    const token = obterTokenMunicipe()
    if (!token) return
    let ativo = true
    setConsultandoHorarios(true)
    setHorariosAgenda(null)
    setHorariosReserva([])
    agendamento.consultarHorariosPortalProcesso(token, processo.trim(), ocorrenciaId, dataIsoLocal(dataSel), modalidade)
      .then((res) => {
        if (!ativo) return
        if (!res.ok || !res.data) {
          setTipoHorario("AGENDA")
          setHorariosAgenda([])
          setHoraSel("")
          toast.error(res.error ?? "Não foi possível consultar os horários.")
          return
        }
        setTipoHorario(res.data.tipo)
        setHorariosAgenda(res.data.horarios)
        if (res.data.tipo === "AGENDA") setHoraSel((atual) => res.data!.horarios.includes(atual) ? atual : "")
        setHorariosReserva("horariosReserva" in res.data ? res.data.horariosReserva ?? [] : [])
      })
      .finally(() => { if (ativo) setConsultandoHorarios(false) })
    return () => { ativo = false }
  }, [dataSel, ocorrenciaId, modalidade, processo, tipoTexto])

  const passo1Ok = useMemo(() => {
    return (
      validaCPF_CNPJ(somenteDigitos(cpf)) &&
      somenteDigitos(telefone).length >= 10 &&
      processo.trim().length > 0 &&
      Boolean(tipoTexto) &&
      (tipoTexto !== TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto || (Boolean(modalidade) && duvidaAtendimento.trim().length >= 10)) &&
      Boolean(relacao)
    )
  }, [cpf, telefone, processo, tipoTexto, modalidade, duvidaAtendimento, relacao])

  const horariosDisponiveis = horariosAgenda ?? []

  async function irParaPasso2(forcarConfirmacao = false) {
    const token = obterTokenMunicipe()
    if (!token) {
      toast.error("Faça login para continuar.")
      return
    }
    setValidando(true)
    try {
      const res = await agendamento.validarProcessoPortal(token, processo.trim())
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Não foi possível validar o processo.")
        return
      }
      const v = res.data
	      if (v.erroBi) {
	        toast.error("Não foi possível consultar o BI. Tente novamente mais tarde.")
	        return
	      }
	      setOcorrencias(v.ocorrencias)
	      if (v.encontrado && tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto) {
	        setConfirmadoAusente(false)
	        if (!v.ocorrencias.some((item) => item.id === ocorrenciaId && item.elegivel)) {
	          setOcorrenciaId("")
	          toast.error(v.elegivelAutomatico ? "Selecione a ocorrência relacionada à sua dúvida." : "Nenhuma ocorrência permite atendimento.")
	          return
	        }
	        setPasso(2)
	        return
	      }
	      if (v.elegivelAutomatico && tipoTexto !== TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto) {
	        setPasso(2)
	        return
	      }
	      if (!forcarConfirmacao && !confirmadoAusente) {
        setMensagemDialogo(
	          "Não encontramos este processo na base (atualizada com até 7 dias de atraso). O número está correto?",
        )
        setDialogoAberto(true)
        return
      }
      setPasso(2)
    } finally {
      setValidando(false)
    }
  }

  async function confirmarEnvio(confirmado = confirmadoAusente) {
    const token = obterTokenMunicipe()
    if (!token || !dataSel || !horaSel || !relacao) return
    setEnviando(true)
    try {
      const res = await agendamento.criarSolicitacaoPortalProcesso(token, {
        cpf: somenteDigitos(cpf),
        telefone: somenteDigitos(telefone),
        processo: processo.trim(),
        ocorrenciaId: tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? ocorrenciaId || undefined : undefined,
        modalidade: tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? modalidade || undefined : undefined,
        duvidaAtendimento: tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? duvidaAtendimento : undefined,
        tipoAgendamentoTexto: tipoTexto,
        relacaoInteressado: relacao,
        data: dataIsoLocal(dataSel),
        hora: horaSel,
        confirmadoProcessoAusente: confirmado,
      })
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Não foi possível enviar o agendamento.")
        return
      }
      if ("precisaConfirmacao" in res.data && res.data.precisaConfirmacao) {
        setMensagemDialogo(
          "Não localizamos o processo com comunique-se aberto ou indeferimento. Confirme se o número está correto para enviar à CAP.",
        )
        setDialogoAberto(true)
        return
      }
      const ag = "agendamento" in res.data ? res.data.agendamento : null
      const validacao = "validacao" in res.data ? res.data.validacao : null
      setResumoEnvio({
        conferencia: ag?.conferenciaCapStatus === "AGUARDANDO",
        reserva: !!ag?.encaminhadoReservaEm,
        coordenadoria: ag?.coordenadoria?.sigla ?? validacao?.siglaCoordenadoria,
        dataHora: ag?.dataHora ? formatarDataHoraSaoPaulo(ag.dataHora, true) : undefined,
      })
      setEnviado(true)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner>
        <Link href={BASE} className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Voltar ao Início
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E56E14]">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Processos em Trâmite</h1>
            <p className="mt-1 text-sm text-white/90 sm:text-base">
              Solicite agendamento para processos já protocolados
            </p>
          </div>
        </div>
      </ArthurSaboyaPageBackgroundBanner>
      <main className="flex-1">
        <section className="bg-[#D1EBE8]/20 py-12">
          <div className="container mx-auto px-4">
            {!autenticado ? (
              <div className="mx-auto max-w-2xl">
                <Card>
                  <CardHeader>
                    <CardTitle>Faça login para continuar</CardTitle>
                    <CardDescription>
                      É necessário estar cadastrado no portal para abrir um agendamento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/portal/acesso?proxima=%2Fprocessos">Entrar</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/portal/cadastro?proxima=%2Fprocessos">Criar conta</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : enviado ? (
              <div className="mx-auto max-w-2xl">
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-800">Solicitação enviada</CardTitle>
                    <CardDescription className="text-green-700">
                      {resumoEnvio?.conferencia
                        ? "Sua solicitação foi enviada para conferência da CAP. A base do BI pode levar até 7 dias para atualizar; a equipe analisará e encaminhará à coordenadoria responsável ou responderá se o processo não for localizado."
                        : resumoEnvio?.reserva
                        ? "O técnico responsável está ausente nesse horário. Sua solicitação foi encaminhada ao ponto focal para atribuição de um técnico reserva e confirmação do atendimento."
                        : `Sua solicitação foi enviada${resumoEnvio?.coordenadoria ? ` à coordenadoria ${resumoEnvio.coordenadoria}` : " à coordenadoria responsável"}. O ponto focal atribuirá um técnico e confirmará o horário.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-card p-4 text-sm">
                      <p><span className="text-muted-foreground">Processo:</span> {processo}</p>
                      {ocorrenciaId ? <p><span className="text-muted-foreground">Recurso:</span> {ocorrencias.find((item) => item.id === ocorrenciaId)?.tipo === "DESPACHO" ? "Despacho indeferido" : "Comunique-se"}</p> : null}
                      <p><span className="text-muted-foreground">Tipo:</span> {tipoTexto}</p>
                      {modalidade && tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? <p><span className="text-muted-foreground">Modalidade:</span> {modalidade === "ONLINE" ? "Online" : "Presencial"}</p> : null}
                      <p><span className="text-muted-foreground">Data/hora:</span> {resumoEnvio?.dataHora ?? (dataSel && horaSel ? `${formatarDataBr(dataSel)} às ${horaSel}` : "—")}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <Button asChild variant="outline">
                        <Link href="/consulta">Consultar meus agendamentos</Link>
                      </Button>
                      <Button asChild className="bg-[#E56E14] text-white hover:bg-[#CC5F10]">
                        <Link href={BASE}>Voltar ao início</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl">
                <ol className="mb-6 grid grid-cols-3 gap-2 text-center text-xs font-medium sm:text-sm">
                  {["Dados", "Data e horário", "Confirmação"].map((label, i) => {
                    const n = (i + 1) as Passo
                    const ativo = passo === n
                    const feito = passo > n
                    return (
                      <li
                        key={label}
                        className={cn(
                          "rounded-full border px-2 py-2",
                          ativo && "border-[#E56E14] bg-[#E56E14] text-white",
                          feito && "border-green-600 bg-green-50 text-green-800",
                          !ativo && !feito && "border-border bg-white text-muted-foreground",
                        )}
                      >
                        {n}. {label}
                      </li>
                    )
                  })}
                </ol>

                {passo === 1 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações da solicitação</CardTitle>
                      <CardDescription>Nome e e-mail vêm do seu cadastro no portal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={nome} readOnly className="bg-muted/40 pl-10" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input value={email} readOnly className="bg-muted/40" />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            value={cpf}
                            onChange={(e) => setCpf(mascararCpfInput(e.target.value))}
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone de contato</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="telefone"
                              value={telefone}
                              onChange={(e) => setTelefone(mascararTelefoneInput(e.target.value))}
                              placeholder="(11) 90000-0000"
                              className="pl-10"
                              inputMode="numeric"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="processo">Número do processo</Label>
                        <Input
                          id="processo"
                          value={processo}
                          onChange={(e) => {
                            setProcesso(e.target.value)
                            setConfirmadoAusente(false)
                            setOcorrencias([])
                            setOcorrenciaId("")
                          }}
                          placeholder="0000.0000/0000000-0 ou protocolo"
                          required
                        />
                      </div>
                      {ocorrencias.length > 0 && tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Selecione a ocorrência relacionada à sua dúvida</p>
                          <RadioGroup value={ocorrenciaId || undefined} onValueChange={setOcorrenciaId} className="gap-3">
                            {ocorrencias.map((item) => (
                              <div key={item.id} className="flex items-start gap-3 rounded-md border bg-white p-3">
                                <RadioGroupItem value={item.id} id={`ocorrencia-${item.id}`} disabled={!item.elegivel} className="mt-1" />
                                <Label htmlFor={`ocorrencia-${item.id}`} className="cursor-pointer font-normal leading-relaxed">
                                  <span className="font-medium">{item.tipo === "DESPACHO" ? "Despacho" : "Comunique-se"}</span>
                                  {` · Processo: ${item.processo ?? "—"} · Protocolo: ${item.protocolo ?? "—"}`}
                                  {` · Sistema: ${item.sistema ?? "—"} · Situação: ${item.situacao ?? "—"} · Unidade: ${item.unidade ?? "—"}`}
                                  {!item.elegivel ? " · Não elegível para atendimento" : ""}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      ) : null}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Tipo de agendamento</p>
                        <RadioGroup value={tipoTexto || undefined} onValueChange={setTipoTexto} className="gap-3">
                          {TIPOS_AGENDAMENTO_PORTAL_PROCESSO.map((t) => (
                            <div key={t.texto} className="flex items-start gap-3">
                              <RadioGroupItem value={t.texto} id={`tipo-${t.texto}`} className="mt-0.5" />
                              <Label htmlFor={`tipo-${t.texto}`} className="cursor-pointer font-normal leading-snug">
                                {t.texto}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                      {tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="duvida-atendimento">Qual é a sua dúvida?</Label>
                            <Textarea
                              id="duvida-atendimento"
                              value={duvidaAtendimento}
                              onChange={(e) => setDuvidaAtendimento(e.target.value)}
                              minLength={10}
                              maxLength={5000}
                              placeholder="Descreva o assunto do atendimento"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Modalidade do atendimento</p>
                            <RadioGroup value={modalidade || undefined} onValueChange={(valor) => setModalidade(valor as "PRESENCIAL" | "ONLINE")} className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2"><RadioGroupItem value="ONLINE" id="modalidade-online" /><Label htmlFor="modalidade-online">Online</Label></div>
                              <div className="flex items-center gap-2"><RadioGroupItem value="PRESENCIAL" id="modalidade-presencial" /><Label htmlFor="modalidade-presencial">Presencial</Label></div>
                            </RadioGroup>
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Relação com o projeto</p>
                        <RadioGroup
                          value={relacao || undefined}
                          onValueChange={(v) => setRelacao(v as RelacaoInteressadoValor)}
                          className="gap-3"
                        >
                          {RELACOES_INTERESSADO.map((r) => (
                            <div key={r.valor} className="flex items-start gap-3">
                              <RadioGroupItem value={r.valor} id={`rel-${r.valor}`} className="mt-0.5" />
                              <Label htmlFor={`rel-${r.valor}`} className="cursor-pointer font-normal">
                                {r.rotulo}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          className="bg-[#E56E14] text-white hover:bg-[#CC5F10]"
                          disabled={!passo1Ok || validando}
                          onClick={() => void irParaPasso2()}
                        >
                          {validando ? "Validando processo..." : "Continuar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {passo === 2 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[#E56E14]" />
                        Escolha a data e o horário
                      </CardTitle>
                      <CardDescription>{tipoHorario === "AGENDA" ? "Horários disponíveis na agenda do técnico." : "Informe um horário de preferência. A coordenadoria confirmará a disponibilidade."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Calendar
                        mode="single"
                        selected={dataSel}
                        onSelect={(d) => {
                          setDataSel(d)
                          setHoraSel("")
                        }}
                        locale={ptBR}
                        disabled={(date) => {
                          const agora = partesAgoraSaoPaulo()
                          const hoje = new Date(agora.ano, agora.mes - 1, agora.dia)
                          return date < hoje || date.getDay() === 0 || date.getDay() === 6
                        }}
                        className="rounded-md border bg-white"
                      />
                      {dataSel ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Horários em {formatarDataBr(dataSel)}</p>
                          {consultandoHorarios ? <p className="text-sm text-muted-foreground">Consultando agenda...</p> : tipoHorario === "PREFERENCIA" ? (
                            <div className="max-w-xs space-y-2"><Label htmlFor="hora-preferencia">Horário de preferência (9h às 16h)</Label><Input id="hora-preferencia" type="time" min="09:00" max="16:00" step={1800} value={horaSel} onChange={(e) => setHoraSel(e.target.value)} /></div>
                          ) : horariosDisponiveis.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Não há horários disponíveis nesta data.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {horariosDisponiveis.map((h) => (
                                <Button
                                  key={h}
                                  type="button"
                                  variant={horaSel === h ? "default" : "outline"}
                                  className={horaSel === h ? "bg-[#E56E14] hover:bg-[#CC5F10]" : ""}
                                  onClick={() => setHoraSel(h)}
                                >
                                  {h}{horariosReserva.includes(h) ? " · reserva" : ""}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setPasso(1)}>
                          Voltar
                        </Button>
                        <Button
                          className="bg-[#E56E14] text-white hover:bg-[#CC5F10]"
                          disabled={!dataSel || !horaSel || consultandoHorarios}
                          onClick={() => setPasso(3)}
                        >
                          Continuar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {passo === 3 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Confirme os dados</CardTitle>
                      <CardDescription>Revise as informações antes de enviar a solicitação.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      {confirmadoAusente ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                          O processo não foi localizado automaticamente na base. A solicitação seguirá para conferência
                          manual da CAP.
                        </div>
                      ) : null}
                      {horariosReserva.includes(horaSel) ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">O responsável indicado no BI está ausente neste horário. A solicitação será encaminhada para técnico reserva.</p> : null}
                      {tipoHorario === "PREFERENCIA" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">O horário informado é uma preferência e dependerá de confirmação pela coordenadoria.</p> : null}
                      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                        <p><span className="text-muted-foreground">Nome:</span> {nome}</p>
                        <p><span className="text-muted-foreground">E-mail:</span> {email}</p>
                        <p><span className="text-muted-foreground">CPF:</span> {cpf}</p>
                        <p><span className="text-muted-foreground">Telefone:</span> {telefone}</p>
                        <p className="sm:col-span-2"><span className="text-muted-foreground">Processo:</span> {processo}</p>
                        {ocorrenciaId ? <p className="sm:col-span-2"><span className="text-muted-foreground">Recurso:</span> {ocorrencias.find((item) => item.id === ocorrenciaId)?.tipo === "DESPACHO" ? "Despacho indeferido" : "Comunique-se"}</p> : null}
                        {ocorrenciaId ? <p className="sm:col-span-2"><span className="text-muted-foreground">Contexto BI:</span> {(() => { const item = ocorrencias.find((o) => o.id === ocorrenciaId); return [item?.protocolo, item?.situacao, item?.unidade, item?.responsavel].filter(Boolean).join(" · ") || "—" })()}</p> : null}
                        <p className="sm:col-span-2"><span className="text-muted-foreground">Tipo:</span> {tipoTexto}</p>
                        {tipoTexto === TIPOS_AGENDAMENTO_PORTAL_PROCESSO[0].texto ? (
                          <>
                            <p className="sm:col-span-2"><span className="text-muted-foreground">Modalidade:</span> {modalidade === "ONLINE" ? "Online" : "Presencial"}</p>
                            <p className="sm:col-span-2"><span className="text-muted-foreground">Dúvida:</span> {duvidaAtendimento}</p>
                          </>
                        ) : null}
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Relação:</span> {rotuloRelacaoInteressado(relacao)}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Data e horário:</span>{" "}
                          {dataSel ? `${formatarDataBr(dataSel)} às ${horaSel}` : "—"}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setPasso(2)}>
                          Voltar
                        </Button>
                        <Button
                          className="bg-[#E56E14] text-white hover:bg-[#CC5F10]"
                          disabled={enviando}
                          onClick={() => void confirmarEnvio()}
                        >
                          {enviando ? "Enviando..." : "Enviar solicitação"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>
      <ArthurSaboyaFooter />

      <AlertDialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confira o número do processo</AlertDialogTitle>
            <AlertDialogDescription>{mensagemDialogo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Corrigir número</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#E56E14] hover:bg-[#CC5F10]"
              onClick={() => {
                setConfirmadoAusente(true)
                setDialogoAberto(false)
                if (passo === 3) {
                  void confirmarEnvio(true)
                } else {
                  setPasso(2)
                }
              }}
            >
              Sim, está correto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
