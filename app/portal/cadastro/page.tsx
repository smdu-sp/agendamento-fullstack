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

function FormularioCadastro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = useMemo(getApiBase, []);
  const [carregando, setCarregando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const proxima = destinoAposLoginSeguro(searchParams.get("proxima"));

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const data = await requisicao<TokenResponse>("/municipes/auth/cadastro", {
        nome: nome.trim(),
        email: email.trim(),
        senha,
      });
      salvarSessaoMunicipe(data.access_token);
      toast.success("Conta criada com sucesso.");
      setNome("");
      setEmail("");
      setSenha("");
      router.replace(proxima ?? "/portal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  const queryAcesso = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cadastre-se para acompanhar e gerenciar seus pedidos no portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cad-nome">Nome completo</Label>
            <Input id="cad-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cad-email">E-mail</Label>
            <Input
              id="cad-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cad-senha">Senha</Label>
            <InputSenhaComToggle
              id="cad-senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Já possui conta?{" "}
          <Link href={`/portal/acesso${queryAcesso}`} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function CadastroMunicipePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner
        title="Criar Conta"
        subtitle="Cadastre-se para acompanhar e gerenciar seus pedidos no portal."
      />
      <main className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="container mx-auto px-4">
          <Suspense
            fallback={
              <Card className="mx-auto w-full max-w-md">
                <CardHeader>
                  <CardTitle>Criar conta</CardTitle>
                  <CardDescription>Carregando…</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <FormularioCadastro />
          </Suspense>
        </div>
      </main>
      <ArthurSaboyaFooter />
    </div>
  );
}
