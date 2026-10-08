/** @format */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as municipe from "@/services/municipes";
import { IMunicipe } from "@/types/municipe";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function ModalResetarSenha({ municipe: dados }: { municipe: IMunicipe }) {
  const [open, setOpen] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(valor: boolean) {
    setOpen(valor);
    // A senha só é exibida uma vez: ao fechar, descarta.
    if (!valor) setSenhaTemporaria(null);
  }

  function handleResetar() {
    startTransition(() => {
      void (async () => {
        const resp = await municipe.resetarSenha(dados.id);
        if (!resp.ok || !resp.data || !("senhaTemporaria" in resp.data)) {
          toast.error("Algo deu errado", { description: resp.error });
          return;
        }
        setSenhaTemporaria(resp.data.senhaTemporaria);
        toast.success("Senha redefinida");
      })();
    });
  }

  async function copiar() {
    if (!senhaTemporaria) return;
    try {
      await navigator.clipboard.writeText(senhaTemporaria);
      toast.success("Senha copiada");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size={"icon"}
          variant={"outline"}
          title="Resetar senha"
          className="bg-background hover:bg-primary group transition-all ease-linear duration-200"
        >
          <KeyRound size={24} className="text-primary dark:text-white group-hover:text-white group" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>
            {dados.nome} ({dados.email})
          </DialogDescription>
        </DialogHeader>
        {senhaTemporaria ? (
          <div className="space-y-3">
            <p className="text-sm">
              Senha temporária gerada. Repasse ao munícipe e oriente a trocá-la em{" "}
              <strong>Esqueci minha senha</strong> se desejar. Ela não será exibida novamente.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all rounded-md border bg-muted px-3 py-2 font-mono text-lg tracking-wider">
                {senhaTemporaria}
              </code>
              <Button size={"icon"} variant={"outline"} onClick={copiar} title="Copiar">
                <Copy size={18} />
              </Button>
            </div>
          </div>
        ) : (
          <p>
            Uma nova senha temporária será gerada e a senha atual deixará de funcionar.
            Links de redefinição enviados antes também serão invalidados. Deseja continuar?
          </p>
        )}
        <DialogFooter>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant={"outline"}>{senhaTemporaria ? "Fechar" : "Voltar"}</Button>
            </DialogClose>
            {!senhaTemporaria && (
              <Button disabled={isPending} onClick={handleResetar}>
                {isPending ? <Loader2 className="animate-spin" /> : "Resetar senha"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
