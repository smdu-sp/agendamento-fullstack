"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer";
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header";
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMunicipeAuthApiUrl } from "@/lib/api-url";
import { toast } from "sonner";

type RecuperacaoResponse = { mensagem: string; linkRedefinicao?: string };

function FormularioEsqueciSenha() {
  const searchParams = useSearchParams();
  const [carregando, setCarregando] = useState(false);
  const [linkRecuperacao, setLinkRecuperacao] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const queryAcesso = searchParams.toString() ? `?${searchParams.toString()}` : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setLinkRecuperacao(null);
    try {
      const res = await fetch(getMunicipeAuthApiUrl("/solicitar-redefinicao-senha"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const message = data?.message;
        const texto = Array.isArray(message) ? message.join(" ") : (message as string) || "Falha ao solicitar redefinição.";
        throw new Error(texto);
      }
      const resultado = data as RecuperacaoResponse | null;
      setLinkRecuperacao(resultado?.linkRedefinicao ?? null);
      toast.success(resultado?.mensagem || "Se o e-mail estiver cadastrado, enviaremos o link para redefinir a senha.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao solicitar redefinição.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Informe o e-mail da sua conta para receber o link de redefinição.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rec-email">E-mail</Label>
            <Input
              id="rec-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Solicitando..." : "Solicitar redefinição"}
          </Button>
        </form>
        {linkRecuperacao ? (
          <p className="text-sm text-muted-foreground">
            Ambiente local:{" "}
            <a href={linkRecuperacao} className="font-medium text-primary underline">
              abrir redefinição de senha
            </a>
          </p>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link href={`/portal/acesso${queryAcesso}`} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function EsqueciSenhaMunicipePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner
        title="Esqueci minha senha"
        subtitle="Informe o e-mail da sua conta para receber o link de redefinição."
      />
      <main className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="container mx-auto px-4">
          <Suspense
            fallback={
              <Card className="mx-auto w-full max-w-md">
                <CardHeader>
                  <CardTitle>Esqueci minha senha</CardTitle>
                  <CardDescription>Carregando…</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <FormularioEsqueciSenha />
          </Suspense>
        </div>
      </main>
      <ArthurSaboyaFooter />
    </div>
  );
}
