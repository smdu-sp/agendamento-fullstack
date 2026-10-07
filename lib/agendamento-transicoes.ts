import { StatusAgendamento } from "@prisma/client";

const permitidas: Record<StatusAgendamento, readonly StatusAgendamento[]> = {
  SOLICITADO: [StatusAgendamento.AGENDADO, StatusAgendamento.CANCELADO],
  AGENDADO: [StatusAgendamento.ATENDIDO, StatusAgendamento.NAO_REALIZADO, StatusAgendamento.CANCELADO],
  ATENDIDO: [StatusAgendamento.CONCLUIDO],
  CONCLUIDO: [],
  NAO_REALIZADO: [],
  CANCELADO: [],
};

export function validarTransicaoAgendamento(atual: StatusAgendamento, destino: StatusAgendamento): void {
  if (atual === destino) return;
  if (!permitidas[atual]?.includes(destino)) {
    throw new Error(`Transição de ${atual} para ${destino} não permitida.`);
  }
}

export function statusTerminal(status: StatusAgendamento): boolean {
  return permitidas[status].length === 0;
}
