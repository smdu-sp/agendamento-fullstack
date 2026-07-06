"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InputSenhaComToggleProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function InputSenhaComToggle({ className, id, ...props }: InputSenhaComToggleProps) {
  const [visivel, setVisivel] = useState(false);
  const gerado = useId();
  const inputId = id ?? gerado;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={visivel ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha digitada"}
        aria-pressed={visivel}
      >
        {visivel ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </Button>
    </div>
  );
}
