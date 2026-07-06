"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImpersonation } from "@/providers/ImpersonationProvider";
import { UserRoundCog } from "lucide-react";

export function ImpersonationSelector() {
  const {
    podePersonificar,
    impersonatePermissao,
    setImpersonatePermissao,
    opcoesPermissao,
    effectivePermissao,
  } = useImpersonation();

  if (!podePersonificar) return null;

  return (
    <div className="px-2 py-2 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserRoundCog className="h-3.5 w-3.5" />
        <span>Personificar permissão</span>
      </div>
      <Select
        value={impersonatePermissao ?? "__nenhuma__"}
        onValueChange={(v) =>
          setImpersonatePermissao(v === "__nenhuma__" ? null : v)
        }
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Nenhuma (DEV)" />
        </SelectTrigger>
        <SelectContent>
          {opcoesPermissao.map((op) => (
            <SelectItem
              key={op.value || "__nenhuma__"}
              value={op.value || "__nenhuma__"}
            >
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {effectivePermissao && effectivePermissao !== "DEV" && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          Visualizando como: {effectivePermissao}
        </p>
      )}
    </div>
  );
}
