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
import * as agendamento from "@/services/agendamentos";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  arquivo: z
    .instanceof(File, { message: "Por favor, selecione um arquivo" })
    .refine((file) => file.size > 0, "O arquivo não pode estar vazio")
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "Arquivo deve ter no máximo 10MB",
    )
    .refine((file) => {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/excel",
      ];
      const validExtensions = [".xlsx", ".xls"];
      const fileName = file.name.toLowerCase();
      return (
        validTypes.includes(file.type) ||
        validExtensions.some((ext) => fileName.endsWith(ext))
      );
    }, "Apenas arquivos Excel (.xlsx, .xls) são permitidos"),
});

export default function ImportarAgendamentosOutlookForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.append("arquivo", values.arquivo);

          const resp = await agendamento.importarPlanilhaOutlook(formData);

          if (resp.error) {
            toast.error("Erro ao importar planilha Outlook", {
              description: resp.error,
              duration: 5000,
            });
            return;
          }

          if (resp.ok && resp.data) {
            const resultado = resp.data as {
              importados: number;
              erros: number;
              duplicados?: number;
            };

            if (resultado.importados > 0) {
              toast.success("Planilha Outlook importada com sucesso", {
                description: `${resultado.importados} agendamento(s) importado(s).${resultado.erros > 0 ? ` ${resultado.erros} linha(s) com erro(s).` : ""}${resultado.duplicados ? ` ${resultado.duplicados} duplicado(s) ignorado(s).` : ""}`,
                duration: 5000,
              });
            } else {
              toast.warning("Nenhum agendamento importado", {
                description:
                  resultado.erros > 0
                    ? `${resultado.erros} erro(s). Verifique o formato (linha 4 = cabeçalho, dados a partir da linha 5).`
                    : "Nenhum dado válido encontrado na planilha.",
                duration: 5000,
              });
            }

            form.reset();
            router.refresh();
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          toast.error("Erro inesperado", {
            description: `Ocorreu um erro ao processar a importação: ${errorMessage}`,
            duration: 5000,
          });
        }
      })();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="arquivo"
          render={({ field: { value, onChange, ...fieldProps } }) => {
            const file = value as File | undefined;
            return (
              <FormItem>
                <FormLabel>Arquivo Excel *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      {...fieldProps}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0];
                        if (selectedFile) {
                          onChange(selectedFile);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    {file && (
                      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <div className="flex gap-2 items-center justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isPending}
          >
            Limpar
          </Button>
          <Button
            disabled={isPending || !form.formState.isValid}
            type="submit"
            className="min-w-[140px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                Importando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar Agendamentos Outlook
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
