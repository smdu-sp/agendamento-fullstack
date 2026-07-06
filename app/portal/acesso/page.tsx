"use client";

import { Suspense, useMemo, useState } from "react";
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
import { toast } from "sonner";

type TokenResponse = { access_token: string };
type RecuperacaoResponse = { mensagem: string; linkRedefinicao?: string };

const getApiBase = () =>
  (process.env.NEXT_PUBLIC_AGENDAMENTOS_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

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
  const apiBase = useMemo(getApiBase, []);
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const proxima = destinoAposLoginSeguro(searchParams.get("proxima"));
  const queryCadastro = searchParams.toString() ? `?${searchParams.toString()}` : "";

  async function requisicao<T>(rota: string, body: unknown): Promise<T> {
    if (!apiBase) throw new Error("Configure NEXT_PUBLIC_AGENDAMENTOS_API_URL no frontend.");
    const res = await fetch(`${apiBase}${rota}`, {
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
      const data = await requisicao<TokenResponse>("/municipes/auth/login", {
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
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href={`/portal/cadastro${queryCadastro}`} className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function FormularioRecuperacao() {
  const apiBase = useMemo(getApiBase, []);
  const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
  const [linkRecuperacao, setLinkRecuperacao] = useState<string | null>(null);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  async function requisicao<T>(rota: string, body: unknown): Promise<T> {
    if (!apiBase) throw new Error("Configure NEXT_PUBLIC_AGENDAMENTOS_API_URL no frontend.");
    const res = await fetch(`${apiBase}${rota}`, {
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

  async function onRecuperarSenha(e: React.FormEvent) {
    e.preventDefault();
    setCarregandoRecuperacao(true);
    setLinkRecuperacao(null);
    try {
      const data = await requisicao<RecuperacaoResponse>(
        "/municipes/auth/solicitar-redefinicao-senha",
        {
          email: emailRecuperacao,
        },
      );
      setLinkRecuperacao(data.linkRedefinicao ?? null);
      toast.success(data.mensagem);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao solicitar redefinição.");
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Solicite o link de redefinição com seu e-mail.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onRecuperarSenha} className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="rec-email">E-mail</Label>
            <Input
              id="rec-email"
              type="email"
              value={emailRecuperacao}
              onChange={(e) => setEmailRecuperacao(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={carregandoRecuperacao} className="md:self-end">
            {carregandoRecuperacao ? "Solicitando..." : "Solicitar redefinição"}
          </Button>
        </form>
        {linkRecuperacao ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ambiente local:{" "}
            <a href={linkRecuperacao} className="underline" target="_blank" rel="noreferrer">
              abrir redefinição de senha
            </a>
          </p>
        ) : null}
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
      <main className="flex-1 space-y-8 py-10">
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
        <div className="container mx-auto px-4">
          <FormularioRecuperacao />
        </div>
      </main>
      <ArthurSaboyaFooter />
    </div>
  );
}
