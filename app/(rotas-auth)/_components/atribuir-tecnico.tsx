/** @format */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as usuario from "@/services/usuarios";
import type { ITecnico } from "@/services/usuarios";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as agendamentoClient from "@/services/agendamentos/client-functions";
import { atualizar as atualizarLocal, consultarDisponibilidadeTecnico } from "@/services/agendamentos/server-functions";
import type { IAgendamento } from "@/types/agendamento";
import { useRouter } from "next/navigation";

interface AtribuirTecnicoProps {
  agendamentoId: string;
  coordenadoriaId: string;
  tecnicoAtual?: { id: string; nome: string } | null;
  usarAgenda?: boolean;
  dataHora?: Date | string;
  modalidade?: "ONLINE" | "PRESENCIAL" | null;
  onSuccess?: () => void;
}

export default function AtribuirTecnico({
  agendamentoId,
  coordenadoriaId,
  tecnicoAtual,
  usarAgenda = false,
  dataHora,
  modalidade,
  onSuccess,
}: AtribuirTecnicoProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [tecnicos, setTecnicos] = useState<ITecnico[]>([]);
  const [selectedTecnico, setSelectedTecnico] = useState<ITecnico | null>(
    tecnicoAtual
      ? { id: tecnicoAtual.id, nome: tecnicoAtual.nome, login: "", email: "" }
      : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendenteTecnico, setPendenteTecnico] = useState<ITecnico | null>(null);
  const [dataEscolhida, setDataEscolhida] = useState(dataHora ? new Date(dataHora).toISOString().slice(0, 10) : "");
  const [slots, setSlots] = useState<{ inicio: string; fim: string }[]>([]);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    async function carregarTecnicos() {
      if (coordenadoriaId && session?.access_token) {
        setIsLoading(true);
        try {
          const resp = await usuario.buscarTecnicosPorCoordenadoria(
            coordenadoriaId,
          );
          if (resp.ok && resp.data) {
            setTecnicos(resp.data as ITecnico[]);
          }
        } catch (error) {
          console.error("Erro ao carregar técnicos:", error);
          toast.error("Erro ao carregar técnicos");
        } finally {
          setIsLoading(false);
        }
      }
    }
    carregarTecnicos();
  }, [coordenadoriaId, session]);

  useEffect(() => {
    if (!pendenteTecnico || !dataEscolhida || !modalidade) return;
    let ativo = true;
    setIsLoading(true);
    consultarDisponibilidadeTecnico(pendenteTecnico.id, dataEscolhida, modalidade)
      .then((lista) => { if (ativo) setSlots(lista); })
      .catch((error) => { if (ativo) { setSlots([]); toast.error(error instanceof Error ? error.message : "Falha ao consultar agenda."); } })
      .finally(() => { if (ativo) setIsLoading(false); });
    return () => { ativo = false; };
  }, [pendenteTecnico, dataEscolhida, modalidade]);

  async function handleAtribuir(tecnico: ITecnico, slot?: { inicio: string; fim: string }) {
    if (!session?.access_token) {
      toast.error("Não autorizado");
      return;
    }

    setIsSaving(true);
    try {
      const resp = usarAgenda
        ? await atualizarLocal(agendamentoId, { tecnicoId: tecnico.id, ...(slot ? { dataHora: slot.inicio, dataFim: slot.fim } : {}) })
        : await agendamentoClient.atualizar(agendamentoId, { tecnicoId: tecnico.id }, session.access_token);

      if (resp.error) {
        toast.error("Erro ao atribuir técnico", { description: resp.error });
      } else {
        const atualizado = resp.data as IAgendamento | null;
        if (atualizado?.teamsJoinUrl) {
          toast.success("Técnico atribuído e reunião Teams criada", {
            description: `${tecnico.nome} foi atribuído e o convite foi enviado.`,
          });
        } else if (atualizado?.teamsUltimoErro) {
          toast.warning("Técnico atribuído, mas a reunião não foi criada", {
            description: atualizado.teamsUltimoErro,
          });
        } else {
          toast.success("Técnico atribuído com sucesso", {
            description: `${tecnico.nome} foi atribuído ao agendamento.`,
          });
        }
        setSelectedTecnico(tecnico);
        setPendenteTecnico(null);
        setOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Erro ao atribuir técnico:", error);
      toast.error("Erro inesperado", {
        description: "Não foi possível atribuir o técnico.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!coordenadoriaId) {
    return <span className="text-muted-foreground">Sem coordenadoria</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-w-[200px]"
        >
          {selectedTecnico ? (
            <span className="truncate">{selectedTecnico.nome}</span>
          ) : (
            <span className="text-muted-foreground">
              Selecione um técnico...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar técnico..." />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum técnico encontrado.</CommandEmpty>
                <CommandGroup>
                  {tecnicos.map((tecnico) => (
                    <CommandItem
                      key={tecnico.id}
                      value={tecnico.nome}
                      onSelect={() => usarAgenda && modalidade ? setPendenteTecnico(tecnico) : void handleAtribuir(tecnico)}
                      disabled={isSaving}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTecnico?.id === tecnico.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {tecnico.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        {pendenteTecnico && usarAgenda && modalidade ? <div className="space-y-3 border-t p-3 text-sm">
          <p className="font-medium">Horários de {pendenteTecnico.nome}</p>
          <Input aria-label="Data para atribuição" type="date" value={dataEscolhida} onChange={(e) => setDataEscolhida(e.target.value)} />
          {isLoading ? <p>Consultando agenda...</p> : slots.length ? <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
            {slots.map((slot) => <Button key={slot.inicio} size="sm" variant="outline" disabled={isSaving} onClick={() => void handleAtribuir(pendenteTecnico, slot)}>
              {slot.inicio.slice(11, 16)}
            </Button>)}
          </div> : <p className="text-muted-foreground">Sem horários livres nesta data. Escolha outra data.</p>}
        </div> : null}
      </PopoverContent>
    </Popover>
  );
}
