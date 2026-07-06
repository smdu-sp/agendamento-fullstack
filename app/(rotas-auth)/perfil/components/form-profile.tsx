/** @format */
"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { atualizar } from "@/services/usuarios";
import { IUsuario } from "@/types/usuario";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  avatar: z.string().optional(),
  nomeSocial: z.string().min(2).max(50),
  nome: z.string().min(2).max(50),
  login: z.string(),
  email: z.string().email(),
  permissao: z.enum([
    "DEV",
    "TEC",
    "ADM",
    "USR",
    "PONTO_FOCAL",
    "COORDENADOR",
    "PORTARIA",
  ]),
});

interface FormProfileProps {
  user: Partial<IUsuario>;
  id: string;
}

export default function FormProfile({ user, id }: FormProfileProps) {
  const [isPending, startTransition] = useTransition();
  const { data: session, update } = useSession();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeSocial: user.nomeSocial || "",
      avatar: user.avatar || "",
      email: user.email || "",
      nome: user.nome || "",
      login: user.login || "",
      permissao:
        (user.permissao as unknown as
          | "DEV"
          | "TEC"
          | "ADM"
          | "USR"
          | "PONTO_FOCAL"
          | "COORDENADOR"
          | "PORTARIA") ?? "PORTARIA",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(() => {
      void (async () => {
        const { nomeSocial } = values;
        try {
          const resp = await atualizar(id, { nomeSocial: nomeSocial });

          if (!resp.ok) {
            toast.error("Algo deu errado");
          } else {
            if (session?.usuario && resp.data) {
              const dataResp = resp.data as IUsuario;
              // Você precisará ajustar isso de acordo com a estrutura da sua sessão e da resposta da API
              const updateSession = await update({
                ...session,
                usuario: {
                  ...session?.usuario,
                  nomeSocial: dataResp.nomeSocial,
                },
              });
              console.log("Sessão atualizada:", updateSession); // Para depuração
            }

            toast.success("Usuário atualizado com sucesso");
          }
        } catch (error) {
          console.log(error);
          toast.error("Algo deu errado");
        } finally {
          window.location.reload();
        }
      })();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="nomeSocial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome de usuário</FormLabel>
              <FormControl>
                <Input placeholder="Nome Social" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nome"
          disabled
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome Completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          disabled
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail:</FormLabel>
              <FormControl>
                <Input placeholder="email@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          disabled
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Login</FormLabel>
              <FormControl>
                <Input placeholder="Login" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} className="w-full">
          Atualizar{" "}
          {isPending ? <RefreshCcw className="animate-spin" /> : <RefreshCcw />}
        </Button>
      </form>
    </Form>
  );
}
