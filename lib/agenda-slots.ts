export type RegraAgenda = {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
  modalidade: "PRESENCIAL" | "ONLINE";
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  ativo: boolean;
};

export type IntervaloOcupado = { inicio: Date; fim: Date };
export type SlotAgenda = { inicio: Date; fim: Date; modalidade: "PRESENCIAL" | "ONLINE" };

export function intervalosSobrepostos(a: IntervaloOcupado, b: IntervaloOcupado): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

function minutos(valor: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) throw new Error("Horário inválido.");
  const [hora, minuto] = valor.split(":").map(Number);
  return hora * 60 + minuto;
}

export function validarRegraAgenda(regra: Pick<RegraAgenda, "diaSemana" | "horaInicio" | "horaFim" | "duracaoMinutos" | "vigenciaInicio" | "vigenciaFim">): void {
  if (!Number.isInteger(regra.diaSemana) || regra.diaSemana < 0 || regra.diaSemana > 6) throw new Error("Dia da semana inválido.");
  const inicio = minutos(regra.horaInicio);
  const fim = minutos(regra.horaFim);
  if (inicio >= fim) throw new Error("O horário final deve ser posterior ao inicial.");
  if (!Number.isInteger(regra.duracaoMinutos) || regra.duracaoMinutos < 5 || regra.duracaoMinutos > fim - inicio) {
    throw new Error("Duração inválida para a faixa de atendimento.");
  }
  if (Number.isNaN(regra.vigenciaInicio.getTime()) || (regra.vigenciaFim && (Number.isNaN(regra.vigenciaFim.getTime()) || regra.vigenciaFim < regra.vigenciaInicio))) {
    throw new Error("Período de vigência inválido.");
  }
}

export function gerarSlotsAgenda(params: {
  data: Date;
  modalidade: "PRESENCIAL" | "ONLINE";
  regras: RegraAgenda[];
  ausencias: IntervaloOcupado[];
  agendamentos: IntervaloOcupado[];
  agoraCivil?: Date;
}): SlotAgenda[] {
  const { data, modalidade, regras, ausencias, agendamentos } = params;
  const dia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const ocupados = [...ausencias, ...agendamentos];
  const slots = new Map<string, SlotAgenda>();
  for (const regra of regras) {
    if (!regra.ativo || regra.modalidade !== modalidade || regra.diaSemana !== dia.getUTCDay()) continue;
    if (dia < regra.vigenciaInicio || (regra.vigenciaFim && dia > regra.vigenciaFim)) continue;
    validarRegraAgenda(regra);
    for (let m = minutos(regra.horaInicio); m + regra.duracaoMinutos <= minutos(regra.horaFim); m += regra.duracaoMinutos) {
      const inicio = new Date(dia.getTime() + m * 60_000);
      const fim = new Date(inicio.getTime() + regra.duracaoMinutos * 60_000);
      const slot = { inicio, fim, modalidade };
      if (params.agoraCivil && inicio <= params.agoraCivil) continue;
      if (!ocupados.some((ocupado) => intervalosSobrepostos(slot, ocupado))) {
        slots.set(`${inicio.toISOString()}/${fim.toISOString()}`, slot);
      }
    }
  }
  return [...slots.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
