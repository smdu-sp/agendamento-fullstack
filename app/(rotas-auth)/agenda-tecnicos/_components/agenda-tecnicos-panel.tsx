"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "@/components/link";
import { useEffectivePermissao } from "@/providers/ImpersonationProvider";
import {
  alterarAtividadeAusencia, alterarAtividadeRegraAgenda, cadastrarAusenciaTecnico,
  cadastrarRegraAgenda, consultarDisponibilidadeTecnico, listarAgendaTecnico,
  listarConflitosAusencia, listarTecnicosAgenda,
} from "@/services/agendamentos/server-functions";

type Tecnicos = Awaited<ReturnType<typeof listarTecnicosAgenda>>;
type Agenda = Awaited<ReturnType<typeof listarAgendaTecnico>>;
type Conflitos = Awaited<ReturnType<typeof listarConflitosAusencia>>;
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hoje = () => {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
};
const horario = (valor: Date | string) => new Date(valor).toISOString().slice(0, 16).replace("T", " às ");

export function AgendaTecnicosPanel() {
  const permissao = useEffectivePermissao();
  const podeGerenciar = ["ADM", "DEV", "PONTO_FOCAL", "COORDENADOR", "DIRETOR"].includes(String(permissao));
  const [tecnicos, setTecnicos] = useState<Tecnicos>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [agenda, setAgenda] = useState<Agenda>({ regras: [], ausencias: [] });
  const [conflitos, setConflitos] = useState<Conflitos>([]);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof consultarDisponibilidadeTecnico>>>([]);
  const [dataConsulta, setDataConsulta] = useState(hoje);
  const [modalidadeConsulta, setModalidadeConsulta] = useState<"ONLINE" | "PRESENCIAL">("ONLINE");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("12:00");
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [modalidadeRegra, setModalidadeRegra] = useState<"ONLINE" | "PRESENCIAL">("ONLINE");
  const [vigenciaInicio, setVigenciaInicio] = useState(hoje);
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [tipoAusencia, setTipoAusencia] = useState("Férias");
  const [inicioAusencia, setInicioAusencia] = useState("");
  const [fimAusencia, setFimAusencia] = useState("");
  const [observacao, setObservacao] = useState("");

  const carregar = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const [a, c] = await Promise.all([listarAgendaTecnico(id), listarConflitosAusencia(id)]);
      setAgenda(a);
      setConflitos(c);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar a agenda.");
    }
  }, []);

  useEffect(() => {
    listarTecnicosAgenda().then((lista) => {
      setTecnicos(lista);
      if (lista.length) setTecnicoId((atual) => atual || lista[0].id);
    }).catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível listar técnicos."));
  }, []);

  useEffect(() => { void carregar(tecnicoId); }, [carregar, tecnicoId]);
  useEffect(() => {
    if (!tecnicoId || !dataConsulta) return;
    let ativo = true;
    consultarDisponibilidadeTecnico(tecnicoId, dataConsulta, modalidadeConsulta)
      .then((lista) => { if (ativo) setSlots(lista); })
      .catch(() => { if (ativo) setSlots([]); });
    return () => { ativo = false; };
  }, [tecnicoId, dataConsulta, modalidadeConsulta, agenda]);

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
      await carregar(tecnicoId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally { setOcupado(false); }
  }

  function salvarRegra(event: FormEvent) {
    event.preventDefault();
    void executar(() => cadastrarRegraAgenda({ tecnicoId, diaSemana, horaInicio, horaFim, duracaoMinutos,
      modalidade: modalidadeRegra, vigenciaInicio, vigenciaFim: vigenciaFim || null }), "Regra de agenda cadastrada.");
  }

  function salvarAusencia(event: FormEvent) {
    event.preventDefault();
    void executar(async () => {
      const resultado = await cadastrarAusenciaTecnico({ tecnicoId, tipo: tipoAusencia, inicio: inicioAusencia, fim: fimAusencia, observacao });
      if (resultado.agendamentosAfetados.length) {
        toast.warning(`${resultado.agendamentosAfetados.length} atendimento(s) confirmado(s) em conflito. Consulte a aba Conflitos.`);
      }
    }, "Ausência cadastrada.");
  }

  return <Card>
    <CardHeader><CardTitle>Agenda dos técnicos</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      {erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : null}
      <div className="max-w-md space-y-2">
        <Label htmlFor="agenda-tecnico">Técnico</Label>
        <select id="agenda-tecnico" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {tecnicos.map((tec) => <option key={tec.id} value={tec.id}>{tec.nome} · {tec.divisao?.sigla ?? tec.login}</option>)}
        </select>
      </div>
      {!tecnicos.length ? <p className="text-sm text-muted-foreground">Nenhum técnico disponível no seu escopo.</p> : null}
      {tecnicoId ? <Tabs defaultValue="agenda" className="space-y-4">
        <TabsList className="h-auto flex-wrap"><TabsTrigger value="agenda">Agenda</TabsTrigger><TabsTrigger value="ausencias">Ausências</TabsTrigger><TabsTrigger value="conflitos">Conflitos ({conflitos.length})</TabsTrigger></TabsList>
        <TabsContent value="agenda" className="space-y-5">
          {podeGerenciar ? <form onSubmit={salvarRegra} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-4">
            <div><Label>Dia da semana</Label><select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{DIAS.map((dia, i) => <option key={dia} value={i}>{dia}</option>)}</select></div>
            <div><Label>Início</Label><Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required /></div>
            <div><Label>Fim</Label><Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required /></div>
            <div><Label>Duração (min)</Label><Input type="number" min={5} value={duracaoMinutos} onChange={(e) => setDuracaoMinutos(Number(e.target.value))} required /></div>
            <div><Label>Modalidade</Label><select value={modalidadeRegra} onChange={(e) => setModalidadeRegra(e.target.value as "ONLINE" | "PRESENCIAL")} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="ONLINE">Online</option><option value="PRESENCIAL">Presencial</option></select></div>
            <div><Label>Vigência início</Label><Input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} required /></div>
            <div><Label>Vigência fim (opcional)</Label><Input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} /></div>
            <div className="flex items-end"><Button type="submit" disabled={ocupado}>Adicionar faixa</Button></div>
          </form> : null}
          <div className="space-y-2"><h3 className="font-medium">Faixas cadastradas</h3>
            {!agenda.regras.length ? <p className="text-sm text-muted-foreground">Nenhuma faixa cadastrada.</p> : null}
            {agenda.regras.map((regra) => <div key={regra.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <span>{DIAS[regra.diaSemana]} · {regra.horaInicio}–{regra.horaFim} · {regra.duracaoMinutos} min · {regra.modalidade === "ONLINE" ? "Online" : "Presencial"} · desde {new Date(regra.vigenciaInicio).toISOString().slice(0, 10)}{regra.vigenciaFim ? ` até ${new Date(regra.vigenciaFim).toISOString().slice(0, 10)}` : ""} · {regra.ativo ? "Ativa" : "Inativa"}</span>
              {podeGerenciar ? <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => void executar(() => alterarAtividadeRegraAgenda(regra.id, !regra.ativo), "Regra atualizada.")}>{regra.ativo ? "Desativar" : "Ativar"}</Button> : null}
            </div>)}
          </div>
          <div className="space-y-2 rounded-lg border p-4"><h3 className="font-medium">Consultar horários livres</h3><div className="flex flex-wrap gap-3"><Input className="w-auto" type="date" value={dataConsulta} onChange={(e) => setDataConsulta(e.target.value)} /><select value={modalidadeConsulta} onChange={(e) => setModalidadeConsulta(e.target.value as "ONLINE" | "PRESENCIAL")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="ONLINE">Online</option><option value="PRESENCIAL">Presencial</option></select></div><p className="text-sm">{slots.length ? slots.map((s) => new Date(s.inicio).toISOString().slice(11, 16)).join(" · ") : "Nenhum horário livre nesta data."}</p></div>
        </TabsContent>
        <TabsContent value="ausencias" className="space-y-5">
          {podeGerenciar ? <form onSubmit={salvarAusencia} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>Tipo</Label><select value={tipoAusencia} onChange={(e) => setTipoAusencia(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{["Férias", "Licença", "Afastamento", "Compromisso institucional", "Bloqueio de agenda", "Outros"].map((tipo) => <option key={tipo}>{tipo}</option>)}</select></div>
            <div><Label>Início</Label><Input type="datetime-local" value={inicioAusencia} onChange={(e) => setInicioAusencia(e.target.value)} required /></div>
            <div><Label>Fim</Label><Input type="datetime-local" value={fimAusencia} onChange={(e) => setFimAusencia(e.target.value)} required /></div>
            <div className="sm:col-span-2"><Label>Observação</Label><Input value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
            <div className="flex items-end"><Button type="submit" disabled={ocupado}>Cadastrar ausência</Button></div>
          </form> : null}
          {!agenda.ausencias.length ? <p className="text-sm text-muted-foreground">Nenhuma ausência cadastrada.</p> : null}
          {agenda.ausencias.map((ausencia) => <div key={ausencia.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><span>{ausencia.tipo} · {horario(ausencia.dataHoraInicio)} a {horario(ausencia.dataHoraFim)} · {ausencia.ativo ? "Ativa" : "Inativa"}{ausencia.observacao ? ` · ${ausencia.observacao}` : ""}</span>{podeGerenciar ? <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => void executar(() => alterarAtividadeAusencia(ausencia.id, !ausencia.ativo), "Ausência atualizada.")}>{ausencia.ativo ? "Desativar" : "Ativar"}</Button> : null}</div>)}
        </TabsContent>
        <TabsContent value="conflitos" className="space-y-3">
          {!conflitos.length ? <p className="text-sm text-muted-foreground">Nenhum atendimento confirmado em conflito com ausências ativas.</p> : null}
          {conflitos.map((c) => <div key={`${c.agendamentoId}-${c.ausenciaId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><span>{horario(c.dataHora)} · {c.processo || c.municipe || "Atendimento"} · {c.tipoAusencia}</span><Button asChild size="sm" variant="outline"><Link href={`/agendamentos/${c.agendamentoId}`}>Abrir atendimento</Link></Button></div>)}
        </TabsContent>
      </Tabs> : null}
    </CardContent>
  </Card>;
}
