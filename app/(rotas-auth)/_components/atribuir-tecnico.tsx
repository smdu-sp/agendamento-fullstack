/** @format */

"use client";

import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";

interface AtribuirTecnicoProps {
  agendamentoId: string;
  coordenadoriaId: string;
  tecnicoAtual?: { id: string; nome: string } | null;
  onSuccess?: () => void;
}

export default function AtribuirTecnico({
  agendamentoId,
  coordenadoriaId,
  tecnicoAtual,
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

  async function handleAtribuir(tecnico: ITecnico) {
    if (!session?.access_token) {
      toast.error("Não autorizado");
      return;
    }

    setIsSaving(true);
    try {
      const resp = await agendamentoClient.atualizar(
        agendamentoId,
        {
          tecnicoId: tecnico.id,
        },
        session.access_token,
      );

      if (resp.error) {
        toast.error("Erro ao atribuir técnico", { description: resp.error });
      } else {
        toast.success("Técnico atribuído com sucesso", {
          description: `${tecnico.nome} foi atribuído ao agendamento.`,
        });
        setSelectedTecnico(tecnico);
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
                      onSelect={() => handleAtribuir(tecnico)}
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
      </PopoverContent>
    </Popover>
  );
}
