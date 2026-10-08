/** @format */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as municipe from "@/services/municipes";
import { IMunicipe } from "@/types/municipe";
import { Check, Loader2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function ModalStatus({ municipe: dados }: { municipe: IMunicipe }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const ativar = !dados.status;

  function handleConfirmar() {
    startTransition(() => {
      void (async () => {
        const resp = await municipe.alterarStatus(dados.id, ativar);
        if (!resp.ok) {
          toast.error("Algo deu errado", { description: resp.error });
          return;
        }
        toast.success(ativar ? "Munícipe ativado" : "Munícipe desativado", {
          description: ativar
            ? "A conta voltou a ter acesso ao portal."
            : "A conta não poderá mais acessar o portal.",
        });
        setOpen(false);
        router.refresh();
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={"icon"}
          variant={"outline"}
          title={ativar ? "Ativar" : "Desativar"}
          className={`${
            ativar ? "hover:bg-primary" : "hover:bg-destructive"
          } cursor-pointer hover:text-white group transition-all ease-linear duration-200`}
        >
          {ativar ? (
            <Check
              size={24}
              className="text-primary dark:text-white group-hover:text-white group"
            />
          ) : (
            <UserX
              size={24}
              className="text-destructive dark:text-white group-hover:text-white group"
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ativar ? "Ativar Munícipe" : "Desativar Munícipe"}</DialogTitle>
        </DialogHeader>
        <p>
          {ativar
            ? `Tem certeza que deseja ativar a conta de ${dados.nome}?`
            : `Tem certeza que deseja desativar a conta de ${dados.nome}? O acesso ao portal será bloqueado imediatamente.`}
        </p>
        <DialogFooter>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant={"outline"}>Voltar</Button>
            </DialogClose>
            <Button
              disabled={isPending}
              onClick={handleConfirmar}
              variant={ativar ? "default" : "destructive"}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : ativar ? (
                "Ativar"
              ) : (
                "Desativar"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
