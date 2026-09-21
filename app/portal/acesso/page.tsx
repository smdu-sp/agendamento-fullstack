"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer";
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header";
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputSenhaComToggle } from "@/components/ui/input-senha-com-toggle";
import { Label } from "@/components/ui/label";
import { salvarSessaoMunicipe } from "@/lib/municipe-sessao";
import { getMunicipeAuthApiUrl } from "@/lib/api-url";
import { toast } from "sonner";

type TokenResponse = { access_token: string };

function destinoAposLoginSeguro(raw: string | null): string | null {
  if (!raw) return null;
  let path: string;
  try {
    path = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("://") || path.includes("\\")) return null;
  return path;
}

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const proxima = destinoAposLoginSeguro(searchParams.get("proxima"));
  const queryAuth = searchParams.toString() ? `?${searchParams.toString()}` : "";

  async function requisicao<T>(rota: string, body: unknown): Promise<T> {
    const res = await fetch(getMunicipeAuthApiUrl(rota), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const message = data?.message;
      const texto = Array.isArray(message) ? message.join(" ") : (message as string) || "Erro inesperado.";
      throw new Error(texto);
    }
    return data as T;
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setCarregandoLogin(true);
    try {
      const data = await requisicao<TokenResponse>("/login", {
        email: loginEmail,
        senha: loginSenha,
      });
      salvarSessaoMunicipe(data.access_token);
      toast.success("Login realizado com sucesso.");
      router.replace(proxima ?? "/portal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível realizar o login.");
    } finally {
      setCarregandoLogin(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse com e-mail e senha.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-senha">Senha</Label>
            <InputSenhaComToggle
              id="login-senha"
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" disabled={carregandoLogin} className="w-full">
            {carregandoLogin ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-center text-sm">
          <Link href={`/portal/esqueci-senha${queryAuth}`} className="font-medium text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href={`/portal/cadastro${queryAuth}`} className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function AcessoMunicipePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner
        title="Acesso ao Portal"
        subtitle="Entre para consultar seus agendamentos e gerenciar suas solicitações."
      />
      <main className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="container mx-auto px-4">
          <Suspense
            fallback={
              <Card className="mx-auto w-full max-w-md">
                <CardHeader>
                  <CardTitle>Entrar</CardTitle>
                  <CardDescription>Carregando…</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <FormularioLogin />
          </Suspense>
        </div>
      </main>
      <ArthurSaboyaFooter />
    </div>
  );
}
