"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { setImpersonatePermissaoStorage } from "@/lib/api-headers";

const PERMISSOES: { value: string; label: string }[] = [
  { value: "", label: "Nenhuma (DEV)" },
  { value: "ADM", label: "Administrador" },
  { value: "TEC", label: "Técnico" },
  { value: "USR", label: "Usuário" },
  { value: "PONTO_FOCAL", label: "Ponto Focal" },
  { value: "COORDENADOR", label: "Coordenador" },
  { value: "PORTARIA", label: "Portaria" },
];

type ImpersonationContextType = {
  /** Permissão personificada (vazia = não personificando) */
  impersonatePermissao: string | null;
  setImpersonatePermissao: (value: string | null) => void;
  /** Permissão efetiva para uso na UI: personificada ou real (só DEV pode personificar) */
  effectivePermissao: string | null;
  /** Se o usuário logado é DEV (pode usar personificação) */
  podePersonificar: boolean;
  opcoesPermissao: typeof PERMISSOES;
};

const ImpersonationContext = createContext<ImpersonationContextType | null>(
  null,
);

function getStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("impersonate_permissao");
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [impersonatePermissao, setState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(getStored());
    setHydrated(true);
  }, []);

  const setImpersonatePermissao = useCallback((value: string | null) => {
    const v = value && value.trim() ? value.trim() : null;
    setState(v);
    setImpersonatePermissaoStorage(v);
  }, []);

  const permissaoReal = session?.usuario?.permissao as string | undefined;
  const isDev = permissaoReal === "DEV";
  const effectivePermissao =
    isDev && impersonatePermissao && hydrated
      ? impersonatePermissao
      : permissaoReal ?? null;

  const value: ImpersonationContextType = {
    impersonatePermissao: hydrated ? impersonatePermissao : null,
    setImpersonatePermissao,
    effectivePermissao,
    podePersonificar: isDev,
    opcoesPermissao: PERMISSOES,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx)
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}

/** Retorna a permissão efetiva para uso em checagens de UI (personificada se DEV estiver personificando) */
export function useEffectivePermissao(): string | null {
  const { effectivePermissao } = useImpersonation();
  return effectivePermissao;
}
