"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { encerrarSessaoMunicipe, EVENTO_SESSAO_MUNICIPE, obterNomeMunicipe } from "@/lib/municipe-sessao";

type Variant = "header" | "footer";

export function MunicipeNavAuth({ variant = "header" }: { variant?: Variant }) {
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);

  const sincronizar = useCallback(() => {
    setNome(obterNomeMunicipe());
  }, []);

  useEffect(() => {
    sincronizar();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "municipe_access_token" || e.key === "municipe_nome" || e.key === "municipe_email")
        sincronizar();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENTO_SESSAO_MUNICIPE, sincronizar);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENTO_SESSAO_MUNICIPE, sincronizar);
    };
  }, [sincronizar]);

  function sair() {
    encerrarSessaoMunicipe();
    router.refresh();
  }

  const isFooter = variant === "footer";
  const linkBase = isFooter
    ? "text-sm text-muted-foreground hover:text-foreground transition-colors"
    : "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const linkCadastro = isFooter ? linkBase : `${linkBase} text-primary hover:text-primary/80`;
  const nomeClass = isFooter
    ? "text-sm text-muted-foreground max-w-[200px] truncate"
    : "max-w-[220px] truncate text-sm font-medium text-foreground";

  if (nome) {
    return (
      <div
        className={
          isFooter ? "flex flex-row flex-wrap items-center gap-x-4 gap-y-1" : "flex items-center gap-3"
        }
      >
        <span className={nomeClass} title={nome}>
          {nome}
        </span>
        <button
          type="button"
          onClick={sair}
          className={
            isFooter
              ? "text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              : "text-sm font-medium text-primary transition-colors hover:text-primary/80"
          }
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className={isFooter ? "flex flex-row flex-wrap items-center gap-x-4 gap-y-1" : "flex items-center gap-3"}>
      <Link href="/portal/acesso" className={linkBase}>
        Entrar
      </Link>
      <Link href="/portal/cadastro" className={linkCadastro}>
        Criar conta
      </Link>
    </div>
  );
}
