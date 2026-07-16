/** @format */

"use client";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as usuario from "@/services/usuarios";
import * as divisaoService from "@/services/divisoes";
import * as coordenadoriaService from "@/services/coordenadorias";
import { IPermissao, IUsuario, INovoUsuario } from "@/types/usuario";
import { IDivisao } from "@/types/divisao";
import { ICoordenadoria } from "@/types/coordenadoria";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffectivePermissao } from "@/providers/ImpersonationProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { usaDivisaoFixaArthurSaboya } from "@/lib/arthur-saboya-perfis";

const formSchemaUsuario = z.object({
  nome: z.string(),
  login: z.string(),
  email: z.string().email(),
  permissao: z.enum([
    "DEV",
    "TEC",
    "ARTHUR_SABOYA",
    "ADM_ARTHUR_SABOYA",
    "ADM",
    "USR",
    "PONTO_FOCAL",
    "COORDENADOR",
    "PORTARIA",
    "DIRETOR",
  ]),
  divisaoId: z.string().optional(),
});

const formSchema = z.object({
  login: z.string(),
});

interface FormUsuarioProps {
  isUpdating: boolean;
  user?: Partial<IUsuario>;
  onClose?: () => void;
}

export default function FormUsuario({
  isUpdating,
  user,
  onClose,
}: FormUsuarioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [todasDivisoes, setTodasDivisoes] = useState<IDivisao[]>([]);
  const [coordenadorias, setCoordenadorias] = useState<ICoordenadoria[]>([]);
  const [coordenadoriaId, setCoordenadoriaId] = useState<string>(
    user?.divisao?.coordenadoriaId || ""
  );

  const { data: session } = useSession();
  const effectivePermissao = useEffectivePermissao();
  const permissaoAtual = (effectivePermissao ?? session?.usuario?.permissao ?? "") as string;
  const somentePermissoesCoord =
    permissaoAtual === "PONTO_FOCAL" || permissaoAtual === "COORDENADOR";

  const formUsuario = useForm<z.infer<typeof formSchemaUsuario>>({
    resolver: zodResolver(formSchemaUsuario),
    defaultValues: {
      email: user?.email || "",
      login: user?.login || "",
      nome: user?.nome || "",
      permissao:
        (user?.permissao as unknown as
          | "DEV"
          | "TEC"
          | "ARTHUR_SABOYA"
          | "ADM_ARTHUR_SABOYA"
          | "ADM"
          | "USR"
          | "PONTO_FOCAL"
          | "COORDENADOR"
          | "PORTARIA"
          | "DIRETOR") ?? "USR",
      divisaoId: user?.divisaoId || "",
    },
  });
  const permissaoSelecionada = formUsuario.watch("permissao");
  const normalizarSigla = (valor?: string) =>
    String(valor || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  // Divisão fixa para permissão Técnico Arthur Saboya (coordenadoria CAP)
  const divisaoArthurSaboyaId = useMemo(() => {
    const porCap = todasDivisoes.find((div) => {
      const siglaCoord = normalizarSigla(div.coordenadoria?.sigla);
      const siglaDiv = normalizarSigla(div.sigla);
      return (
        siglaCoord === "CAP" &&
        (siglaDiv === "ARTHURSABOYA" || siglaDiv === "ATHURSABOYA")
      );
    });
    if (porCap?.id) return porCap.id;

    const fallback = todasDivisoes.find((div) => {
      const siglaDiv = normalizarSigla(div.sigla);
      return siglaDiv === "ARTHURSABOYA" || siglaDiv === "ATHURSABOYA";
    });
    return fallback?.id;
  }, [todasDivisoes]);

  // Divisões filtradas pela coordenadoria selecionada
  const coordenadoriasDisponiveis = useMemo(() => {
    if (coordenadorias.length > 0) return coordenadorias;

    const map = new Map<string, ICoordenadoria>();
    for (const divisao of todasDivisoes) {
      const coord = divisao.coordenadoria;
      if (coord?.id && !map.has(coord.id)) {
        map.set(coord.id, {
          id: coord.id,
          sigla: coord.sigla,
          nome: coord.nome ?? undefined,
          email: "",
          status: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        });
      }
    }
    return Array.from(map.values());
  }, [coordenadorias, todasDivisoes]);

  const divisoesFiltradas = useMemo(
    () =>
      coordenadoriaId
        ? todasDivisoes.filter((d) => d.coordenadoriaId === coordenadoriaId)
        : todasDivisoes,
    [todasDivisoes, coordenadoriaId]
  );

  useEffect(() => {
    async function carregar() {
      if (!session?.access_token) return;
      const [respDiv, respCoord] = await Promise.all([
        divisaoService.listaCompleta(),
        coordenadoriaService.listaCompleta(),
      ]);
      if (respDiv.ok && respDiv.data) setTodasDivisoes(respDiv.data as IDivisao[]);
      if (respCoord.ok && respCoord.data) setCoordenadorias(respCoord.data as ICoordenadoria[]);
      if (!respCoord.ok) {
        toast.error("Falha ao carregar coordenadorias", {
          description: respCoord.error || "Não foi possível carregar a lista.",
        });
      }
    }
    carregar();
  }, [session]);

  useEffect(() => {
    if (usaDivisaoFixaArthurSaboya(permissaoSelecionada)) {
      const divisaoArthur = todasDivisoes.find((d) => d.id === divisaoArthurSaboyaId);
      setCoordenadoriaId(divisaoArthur?.coordenadoriaId || "");
      formUsuario.setValue("divisaoId", divisaoArthurSaboyaId || "");
    }
  }, [permissaoSelecionada, formUsuario, divisaoArthurSaboyaId, todasDivisoes]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const token = session?.access_token;

    if (!token) {
      toast.error("Não autorizado", {
        description: "Sessão inválida. Faça login novamente.",
      });
      return;
    }

    if (!values.login || values.login.trim() === "") {
      toast.error("Login inválido", { description: "Digite um login válido" });
      return;
    }

    setIsSearching(true);
    try {
      const { login } = values;
      const resp = await usuario.buscarNovo(login.trim());

      if (!resp.ok || resp.error) {
        // Se for erro 401, a sessão expirou
        if (resp.status === 401) {
          toast.error("Sessão expirada", {
            description: "Por favor, faça login novamente",
          });
        } else {
          toast.error("Erro ao buscar usuário", {
            description: resp.error || "Não foi possível encontrar o usuário",
          });
        }
        return;
      }

      if (
        resp.data &&
        "login" in resp.data &&
        "nome" in resp.data &&
        "email" in resp.data
      ) {
        const usuarioEncontrado = resp.data as INovoUsuario;
        toast.success("Usuário encontrado", {
          description: usuarioEncontrado.nome,
        });
        formUsuario.setValue("nome", usuarioEncontrado.nome);
        formUsuario.setValue("email", usuarioEncontrado.email);
        formUsuario.setValue("login", usuarioEncontrado.login);
        form.reset();
      } else {
        toast.error("Dados inválidos", {
          description: "A resposta não contém os dados esperados",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao buscar usuário", { description: errorMessage });
    } finally {
      setIsSearching(false);
    }
  }

  async function onSubmitUser(values: z.infer<typeof formSchemaUsuario>) {
    startTransition(() => {
      void (async () => {
        if (isUpdating && user?.id) {
          if (usaDivisaoFixaArthurSaboya(values.permissao) && !divisaoArthurSaboyaId) {
            toast.error("Divisão padrão não encontrada", {
              description:
                "Não foi possível localizar a divisão ATHURSABOYA na coordenadoria CAP.",
            });
            return;
          }
          const deveEnviarDivisao =
            values.permissao === "PONTO_FOCAL" ||
            values.permissao === "TEC" ||
            values.permissao === "COORDENADOR" ||
            values.permissao === "DIRETOR" ||
            usaDivisaoFixaArthurSaboya(values.permissao);
          const resp = await usuario.atualizar(user?.id, {
            permissao: values.permissao as unknown as IPermissao,
            divisaoId: deveEnviarDivisao
              ? usaDivisaoFixaArthurSaboya(values.permissao)
                ? divisaoArthurSaboyaId
                : values.divisaoId || undefined
              : undefined,
          });

          if (resp.error) {
            toast.error("Algo deu errado", { description: resp.error });
          }

          if (resp.ok) {
            toast.success("Usuário atualizado", {
              description: "Os dados do usuário foram salvos com sucesso.",
            });
            onClose?.();
            router.refresh();
          }
        } else {
          if (usaDivisaoFixaArthurSaboya(values.permissao) && !divisaoArthurSaboyaId) {
            toast.error("Divisão padrão não encontrada", {
              description:
                "Não foi possível localizar a divisão ATHURSABOYA na coordenadoria CAP.",
            });
            return;
          }
          const { email, login, nome, permissao, divisaoId } = values;
          const deveEnviarDivisao =
            permissao === "PONTO_FOCAL" ||
            permissao === "TEC" ||
            permissao === "COORDENADOR" ||
            permissao === "DIRETOR" ||
            usaDivisaoFixaArthurSaboya(permissao);
          const resp = await usuario.criar({
            email,
            login,
            nome,
            permissao: permissao as unknown as IPermissao,
            divisaoId: deveEnviarDivisao
              ? usaDivisaoFixaArthurSaboya(permissao)
                ? divisaoArthurSaboyaId
                : divisaoId || undefined
              : undefined,
          });
          if (resp.error) {
            toast.error("Algo deu errado", { description: resp.error });
          }
          if (resp.ok) {
            toast.success("Usuário criado", {
              description: "O usuário foi cadastrado com sucesso.",
            });
            onClose?.();
            router.refresh();
          }
        }
      })();
    });
  }

  return (
    <>
      {!isUpdating && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className=" flex items-end gap-2 w-full mb-5"
          >
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Login de rede</FormLabel>
                  <FormControl>
                    <Input placeholder="Login do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={isSearching || !form.formState.isValid}
              type="submit"
            >
              {isSearching ? (
                <>
                  Buscar <Loader2 className="animate-spin" />
                </>
              ) : (
                <>
                  Buscar <ArrowRight />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      <Form {...formUsuario}>
        <form
          onSubmit={formUsuario.handleSubmit(onSubmitUser)}
          className="space-y-4"
        >
          <FormField
            control={formUsuario.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Login de rede</FormLabel>
                <FormControl>
                  <Input disabled placeholder="Login do usuário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formUsuario.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input disabled placeholder="Nome do usuário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formUsuario.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    disabled
                    type="email"
                    placeholder="E-mail do usuário"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formUsuario.control}
            name="permissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissão</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={"Defina a permissão"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!somentePermissoesCoord && (
                      <>
                        <SelectItem value="DEV">Desenvolvedor</SelectItem>
                        <SelectItem value="ADM">Administrador</SelectItem>
                        <SelectItem value="COORDENADOR">Coordenador</SelectItem>
                        <SelectItem value="PORTARIA">Portaria</SelectItem>
                      </>
                    )}
                    <SelectItem value="USR">Usuário</SelectItem>
                    <SelectItem value="PONTO_FOCAL">Ponto Focal</SelectItem>
                    <SelectItem value="DIRETOR">Diretor</SelectItem>
                    <SelectItem value="TEC">Técnico</SelectItem>
                    <SelectItem value="ARTHUR_SABOYA">Técnico Arthur Saboya</SelectItem>
                    <SelectItem value="ADM_ARTHUR_SABOYA">
                      Administrador Arthur Saboya
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {(permissaoSelecionada === "PONTO_FOCAL" ||
            permissaoSelecionada === "TEC" ||
            permissaoSelecionada === "COORDENADOR" ||
            permissaoSelecionada === "DIRETOR") && (
            <>
              {/* Seletor de coordenadoria — filtra as divisões abaixo */}
              <FormItem>
                <FormLabel>Coordenadoria</FormLabel>
                <Select
                  value={coordenadoriaId}
                  onValueChange={(val) => {
                    setCoordenadoriaId(val);
                    formUsuario.setValue("divisaoId", "");
                  }}
                  disabled={somentePermissoesCoord}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coordenadoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {coordenadoriasDisponiveis.map((coord) => (
                      <SelectItem key={coord.id} value={coord.id}>
                        {coord.sigla}{coord.nome ? ` — ${coord.nome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={formUsuario.control}
                name="divisaoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Divisão</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!coordenadoriaId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              coordenadoriaId
                                ? divisoesFiltradas.length === 0
                                  ? "Nenhuma divisão nesta coordenadoria"
                                  : "Selecione a divisão"
                                : "Selecione a coordenadoria primeiro"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {divisoesFiltradas.map((div) => (
                          <SelectItem key={div.id} value={div.id}>
                            {div.sigla}{div.nome ? ` — ${div.nome}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <div className="flex gap-2 items-center justify-end">
            <DialogClose asChild>
              <Button variant={"outline"}>Voltar</Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isUpdating ? (
                <>
                  Atualizar {isPending && <Loader2 className="animate-spin" />}
                </>
              ) : (
                <>
                  Adicionar {isPending && <Loader2 className="animate-spin" />}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
