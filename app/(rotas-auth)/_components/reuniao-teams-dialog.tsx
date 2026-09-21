'use client';

import { useState } from 'react';
import { IAgendamento, IResultadoPresenca, StatusAgendamento } from '@/types/agendamento';
import * as agendamentoService from '@/services/agendamentos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Video } from 'lucide-react';
import {
  formatarDataHoraSaoPaulo,
  formatarDuracaoSegundos,
  reuniaoJaTerminou,
} from '@/lib/date-time';
import { montarAssuntoReuniaoPorTipo } from '@/lib/reuniao-teams-titulos';

interface ReuniaoTeamsDialogProps {
  agendamento: IAgendamento;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeGerenciar: boolean;
  onAtualizado: () => void;
}

export function ReuniaoTeamsDialog({
  agendamento,
  open,
  onOpenChange,
  podeGerenciar,
  onAtualizado,
}: ReuniaoTeamsDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  const temReuniao = Boolean(agendamento.teamsEventId || agendamento.teamsJoinUrl);
  const cancelado = agendamento.status === StatusAgendamento.CANCELADO;
  const solicitado = agendamento.status === StatusAgendamento.SOLICITADO;
  const terminou = reuniaoJaTerminou(agendamento.dataFim, agendamento.dataHora);
  const presencas = agendamento.presencasReuniao ?? [];

  async function handleAgendar() {
    setAgendando(true);
    try {
      const res = await agendamentoService.agendarReuniaoTeams(agendamento.id);
      if (!res.ok) {
        toast.error('Não foi possível agendar a reunião', {
          description: res.error || undefined,
        });
        onAtualizado();
        return;
      }
      toast.success('Reunião Teams criada', {
        description: 'O convite foi enviado ao técnico, ao munícipe e à coordenadoria.',
      });
      onAtualizado();
    } catch {
      toast.error('Erro ao agendar reunião.');
    } finally {
      setAgendando(false);
    }
  }

  async function handleCancelar() {
    if (motivo.trim().length < 5) {
      toast.error('Informe o motivo do cancelamento (mínimo 5 caracteres).');
      return;
    }
    setCancelando(true);
    try {
      const res = await agendamentoService.cancelarReuniaoTeams(agendamento.id, motivo);
      if (!res.ok) {
        toast.error('Não foi possível cancelar', { description: res.error || undefined });
        return;
      }
      toast.success('Reunião cancelada.');
      setConfirmarCancelamento(false);
      setMotivo('');
      onAtualizado();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao cancelar reunião.');
    } finally {
      setCancelando(false);
    }
  }

  async function handleSincronizar() {
    setSincronizando(true);
    try {
      const res = await agendamentoService.sincronizarPresenca(agendamento.id, true);
      if (!res.ok) {
        toast.error('Não foi possível obter a presença', {
          description: res.error || undefined,
        });
        return;
      }
      const dados = res.data as IResultadoPresenca | null;
      if (dados?.aguardandoRelatorio) {
        toast.info('Ainda não há relatório de presença no Teams. Tente novamente em alguns minutos.');
      } else if (dados?.temPresenca) {
        toast.success('Presença sincronizada. Atendimento marcado como realizado.');
      } else {
        toast.warning('Sem dados de presença. Status marcado como não realizado.');
      }
      onAtualizado();
    } catch {
      toast.error('Erro ao sincronizar presença.');
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Reunião Teams
          </DialogTitle>
          <DialogDescription>
            Confira os dados do agendamento. Se a criação automática falhar, o ponto
            focal pode tentar novamente por este diálogo (alternativa manual).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-semibold">Título da reunião:</span>{' '}
            {montarAssuntoReuniaoPorTipo({
              tipoAgendamentoTexto: agendamento.tipoAgendamento?.texto,
              siglaCoordenadoria: agendamento.coordenadoria?.sigla,
              processo: agendamento.processo,
            })}
          </p>
          <p>
            <span className="font-semibold">Munícipe:</span> {agendamento.municipe || '—'}
          </p>
          <p>
            <span className="font-semibold">E-mail do munícipe:</span> {agendamento.email || '—'}
          </p>
          <p>
            <span className="font-semibold">Técnico:</span> {agendamento.tecnico?.nome || '—'}
            {agendamento.tecnico?.email ? ` (${agendamento.tecnico.email})` : ''}
          </p>
          <p>
            <span className="font-semibold">Coordenadoria:</span>{' '}
            {agendamento.coordenadoria?.sigla || '—'}
            {agendamento.coordenadoria?.email ? ` — ${agendamento.coordenadoria.email}` : ''}
          </p>
          <p>
            <span className="font-semibold">Data/hora:</span>{' '}
            {formatarDataHoraSaoPaulo(agendamento.dataHora, true)}
          </p>
          <p>
            <span className="font-semibold">Fim:</span>{' '}
            {formatarDataHoraSaoPaulo(agendamento.dataFim, true)}
          </p>
          <p>
            <span className="font-semibold">Processo:</span> {agendamento.processo || '—'}
          </p>
          {agendamento.teamsOrganizerEmail && (
            <p>
              <span className="font-semibold">Organizador (marcador):</span>{' '}
              {agendamento.teamsOrganizerEmail}
            </p>
          )}
          {agendamento.teamsJoinUrl && (
            <p>
              <span className="font-semibold">Link:</span>{' '}
              <a
                href={agendamento.teamsJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all"
              >
                Entrar na reunião
              </a>
            </p>
          )}
          {agendamento.teamsUltimoErro && solicitado && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
              {agendamento.teamsUltimoErro}
            </p>
          )}
          {cancelado && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
              <p className="font-semibold text-destructive">Reunião cancelada</p>
              <p>Motivo: {agendamento.motivoCancelamento || '—'}</p>
              {agendamento.canceladoPor?.nome && (
                <p className="text-muted-foreground">Por {agendamento.canceladoPor.nome}</p>
              )}
            </div>
          )}

          {presencas.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Lista de presença</p>
              <ul className="space-y-1 rounded-md border p-2">
                {presencas.map((p) => (
                  <li key={p.id} className="flex flex-col gap-0.5 border-b last:border-0 py-1">
                    <span>
                      {p.displayName || p.email || 'Participante'}
                      {p.role ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {p.role}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.email || 'sem e-mail'} · {formatarDuracaoSegundos(p.durationSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {podeGerenciar &&
          !cancelado &&
          confirmarCancelamento &&
          (temReuniao || agendamento.status === StatusAgendamento.AGENDADO) && (
          <div className="space-y-2">
            <Label htmlFor="motivo-cancelamento">Motivo do cancelamento</Label>
            <Textarea
              id="motivo-cancelamento"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do cancelamento"
              rows={3}
            />
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {podeGerenciar && solicitado && agendamento.tecnico && (
            <Button onClick={handleAgendar} disabled={agendando}>
              {agendando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {temReuniao ? 'Tentar agendar novamente' : agendamento.teamsUltimoErro ? 'Tentar agendar novamente' : 'Agendar reunião'}
            </Button>
          )}
          {temReuniao && terminou && !cancelado && (
            <Button variant="outline" onClick={handleSincronizar} disabled={sincronizando}>
              {sincronizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar presença
            </Button>
          )}
          {podeGerenciar &&
            !cancelado &&
            (temReuniao || agendamento.status === StatusAgendamento.AGENDADO) &&
            !confirmarCancelamento && (
            <Button variant="destructive" onClick={() => setConfirmarCancelamento(true)}>
              Cancelar reunião
            </Button>
          )}
          {podeGerenciar && confirmarCancelamento && (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmarCancelamento(false)}
                disabled={cancelando}
              >
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={cancelando}>
                {cancelando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar cancelamento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
