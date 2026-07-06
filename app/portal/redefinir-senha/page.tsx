"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer";
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header";
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const getApiBase = () =>
  (process.env.NEXT_PUBLIC_AGENDAMENTOS_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const tokenInicial = searchParams.get("token") || "";
  const apiBase = useMemo(getApiBase, []);

  const [token, setToken] = useState(tokenInicial);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Informe o token de redefinição.");
      return;
    }
    if (novaSenha !== confirmacaoSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!apiBase) {
      toast.error("Configure NEXT_PUBLIC_AGENDAMENTOS_API_URL no frontend.");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch(`${apiBase}/municipes/auth/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const message = data?.message;
        const texto = Array.isArray(message) ? message.join(" ") : (message as string) || "Falha ao redefinir.";
        throw new Error(texto);
      }
      toast.success("Senha redefinida com sucesso.");
      setNovaSenha("");
      setConfirmacaoSenha("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao redefinir senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Informe o token recebido e a nova senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha-confirm">Confirmar nova senha</Label>
            <Input
              id="senha-confirm"
              type="password"
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner
        title="Redefinir Senha"
        subtitle="Informe o token recebido e defina sua nova senha."
      />
      <main className="flex-1 py-10">
        <div className="container mx-auto max-w-xl px-4">
          <Suspense>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </main>
      <ArthurSaboyaFooter />
    </div>
  );
}
