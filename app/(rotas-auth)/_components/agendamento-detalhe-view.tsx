/** @format */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IAgendamento } from "@/types/agendamento";
import { formatarDataHoraSaoPaulo, formatarDuracaoSegundos } from "@/lib/date-time";
import { rotuloRelacaoInteressado } from "@/lib/portal-processos-constantes";
import { ReuniaoTeamsDialog } from "./reuniao-teams-dialog";
import { Video } from "lucide-react";
import { useEffectivePermissao } from "@/providers/ImpersonationProvider";

function formatarData(data?: Date | string | null) {
  return formatarDataHoraSaoPaulo(data, true);
}

function statusLabel(status: string) {
  if (status === "NAO_REALIZADO") return "Não Realizado";
  if (status === "CANCELADO") return "Cancelado";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AgendamentoDetalheView({ agendamento }: { agendamento: IAgendamento }) {
  const { data: session } = useSession();
  const router = useRouter();
  const effectivePermissao = useEffectivePermissao();
  const [dialogAberto, setDialogAberto] = useState(false);
  const permissao = String(effectivePermissao ?? session?.usuario?.permissao ?? "");
  const podeGerenciar = ["PONTO_FOCAL", "COORDENADOR", "ADM", "DEV"].includes(permissao);
  const presencas = agendamento.presencasReuniao ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-[#E5EAF2]">
        <CardHeader>
          <CardTitle>Dados do agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-semibold">Munícipe:</span> {agendamento.municipe || "—"}</p>
          <p><span className="font-semibold">CPF:</span> {agendamento.cpf || "—"}</p>
          <p><span className="font-semibold">Telefone:</span> {agendamento.telefone || "—"}</p>
          <p><span className="font-semibold">Processo:</span> {agendamento.processo || "—"}</p>
          {agendamento.modalidade ? <p><span className="font-semibold">Modalidade:</span> {agendamento.modalidade === "ONLINE" ? "Online" : "Presencial"}</p> : null}
          <p><span className="font-semibold">Data/Hora:</span> {formatarData(agendamento.dataHora)}</p>
          <p><span className="font-semibold">Fim:</span> {formatarData(agendamento.dataFim)}</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <Badge variant="outline">{statusLabel(agendamento.status)}</Badge>
          </div>
          {agendamento.motivoCancelamento && (
            <p>
              <span className="font-semibold">Motivo do cancelamento:</span>{" "}
              {agendamento.motivoCancelamento}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#E5EAF2]">
        <CardHeader>
          <CardTitle>Equipe e encaminhamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-semibold">Coordenadoria:</span> {agendamento.coordenadoria?.sigla || "—"}</p>
          <p><span className="font-semibold">Técnico:</span> {agendamento.tecnico?.nome || "—"}</p>
          {agendamento.teamsSyncPendente ? <p className="font-medium text-amber-700">Atualização da reunião Teams pendente. {agendamento.teamsUltimoErro || "Nova tentativa programada."}</p> : null}
          {agendamento.encaminhadoReservaEm && !agendamento.tecnico ? <p className="font-medium text-amber-700">Aguardando técnico reserva. {agendamento.motivoEncaminhamentoReserva}</p> : null}
          {agendamento.tipoRecurso ? (
            <>
              <p><span className="font-semibold">Recurso:</span> {agendamento.tipoRecurso === "DESPACHO" ? "Despacho indeferido" : "Comunique-se"}</p>
              <p><span className="font-semibold">Protocolo BI:</span> {agendamento.protocoloOrigem || "—"}</p>
              <p><span className="font-semibold">Sistema BI:</span> {agendamento.sistemaOrigem || "—"}</p>
              <p><span className="font-semibold">Situação BI:</span> {agendamento.situacaoRecurso || "—"}</p>
              <p><span className="font-semibold">Unidade original:</span> {agendamento.unidadeOrigem || "—"}</p>
              <p><span className="font-semibold">Responsável original:</span> {agendamento.responsavelOriginal || "—"} {agendamento.responsavelOriginalRF ? `(RF ${agendamento.responsavelOriginalRF})` : ""}</p>
            </>
          ) : null}
          {agendamento.modalidade === "PRESENCIAL" ? (
            <>
              <p><span className="font-semibold">Local:</span> {agendamento.localAtendimento || "A definir"}</p>
              {agendamento.sala ? <p><span className="font-semibold">Sala:</span> {agendamento.sala}</p> : null}
              {agendamento.orientacaoAcesso ? <p><span className="font-semibold">Orientações:</span> {agendamento.orientacaoAcesso}</p> : null}
            </>
          ) : null}
          <p><span className="font-semibold">Divisão:</span> {agendamento.tecnico?.divisao?.sigla || "—"}</p>
          <p><span className="font-semibold">E-mail:</span> {agendamento.email || "—"}</p>
          <p>
            <span className="font-semibold">Tipo de agendamento:</span>{" "}
            {agendamento.tipoAgendamento?.texto || "—"}
          </p>
          {agendamento.relacaoInteressado ? (
            <p>
              <span className="font-semibold">Relação com o projeto:</span>{" "}
              {rotuloRelacaoInteressado(agendamento.relacaoInteressado)}
            </p>
          ) : null}
          {agendamento.origemPortalProcesso ? (
            <p>
              <span className="font-semibold">Origem:</span> Portal do munícipe
              {agendamento.unidadeDespachoBi ? ` · Unidade BI: ${agendamento.unidadeDespachoBi}` : ""}
            </p>
          ) : null}
          <p>
            <span className="font-semibold">Motivo não atendimento:</span>{" "}
            {agendamento.motivoNaoAtendimento?.texto || "—"}
          </p>
        </CardContent>
      </Card>

      {agendamento.modalidade !== "PRESENCIAL" ? <Card className="border-[#E5EAF2] lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Reunião Teams</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
            <Video className="mr-1 h-4 w-4" />
            Ver reunião
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#334155]">
          {agendamento.teamsJoinUrl ? (
            <p>
              <a
                href={agendamento.teamsJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Entrar na reunião
              </a>
            </p>
          ) : (
            <p>Nenhuma reunião Teams criada ainda.</p>
          )}
          {agendamento.teamsOrganizerEmail && (
            <p>
              <span className="font-semibold">Marcador:</span> {agendamento.teamsOrganizerEmail}
            </p>
          )}
          {presencas.length > 0 ? (
            <ul className="space-y-1">
              {presencas.map((p) => (
                <li key={p.id}>
                  {p.displayName || p.email || "Participante"} —{" "}
                  {formatarDuracaoSegundos(p.durationSeconds)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sem dados de presença sincronizados.</p>
          )}
        </CardContent>
      </Card> : null}

      <Card className="border-[#E5EAF2] lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#334155]">
          {agendamento.duvidaAtendimento?.trim() || agendamento.resumo?.trim() || "Sem resumo informado."}
        </CardContent>
      </Card>

      <ReuniaoTeamsDialog
        agendamento={agendamento}
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        podeGerenciar={podeGerenciar}
        onAtualizado={() => router.refresh()}
      />
    </div>
  );
}
