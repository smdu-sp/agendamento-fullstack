/** @format */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IAgendamento } from "@/types/agendamento";
import { formatarDataHoraSaoPaulo } from "@/lib/date-time";

function formatarData(data?: Date | string | null) {
  return formatarDataHoraSaoPaulo(data, true);
}

function statusLabel(status: string) {
  if (status === "NAO_REALIZADO") return "Não Realizado";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AgendamentoDetalheView({ agendamento }: { agendamento: IAgendamento }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-[#E5EAF2]">
        <CardHeader>
          <CardTitle>Dados do agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-semibold">Munícipe:</span> {agendamento.municipe || "—"}</p>
          <p><span className="font-semibold">CPF:</span> {agendamento.cpf || "—"}</p>
          <p><span className="font-semibold">Processo:</span> {agendamento.processo || "—"}</p>
          <p><span className="font-semibold">Data/Hora:</span> {formatarData(agendamento.dataHora)}</p>
          <p><span className="font-semibold">Fim:</span> {formatarData(agendamento.dataFim)}</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <Badge variant="outline">{statusLabel(agendamento.status)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5EAF2]">
        <CardHeader>
          <CardTitle>Equipe e encaminhamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-semibold">Coordenadoria:</span> {agendamento.coordenadoria?.sigla || "—"}</p>
          <p><span className="font-semibold">Técnico:</span> {agendamento.tecnico?.nome || "—"}</p>
          <p><span className="font-semibold">Divisão:</span> {agendamento.tecnico?.divisao?.sigla || "—"}</p>
          <p><span className="font-semibold">E-mail:</span> {agendamento.email || "—"}</p>
          <p>
            <span className="font-semibold">Tipo de agendamento:</span>{" "}
            {agendamento.tipoAgendamento?.texto || "—"}
          </p>
          <p>
            <span className="font-semibold">Motivo não atendimento:</span>{" "}
            {agendamento.motivoNaoAtendimento?.texto || "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#E5EAF2] lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#334155]">
          {agendamento.resumo?.trim() || "Sem resumo informado."}
        </CardContent>
      </Card>
    </div>
  );
}
