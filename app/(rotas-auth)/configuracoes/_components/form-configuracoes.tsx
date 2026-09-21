'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import * as configuracoes from '@/services/configuracoes';
import type { IConfiguracaoReunioes } from '@/types/configuracao';
import { EMAIL_MARCADOR_REUNIOES_PADRAO } from '@/lib/reuniao-teams-titulos';

const schema = z.object({
  emailMarcador: z.string().email('Informe um e-mail válido'),
});

export function FormConfiguracoes({
  inicial,
  podeEditar,
}: {
  inicial: IConfiguracaoReunioes;
  podeEditar: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [testando, setTestando] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { emailMarcador: inicial.emailMarcador },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    startTransition(() => {
      void (async () => {
        const resp = await configuracoes.atualizarEmailMarcador(values.emailMarcador);
        if (!resp.ok) {
          toast.error('Não foi possível salvar', { description: resp.error || undefined });
          return;
        }
        toast.success('E-mail do marcador de reuniões salvo.');
      })();
    });
  }

  async function handleTestar() {
    setTestando(true);
    try {
      const email = form.getValues('emailMarcador');
      const resp = await configuracoes.testarConexaoGraph(email);
      if (!resp.ok) {
        toast.error('Falha na conexão com o Graph', { description: resp.error || undefined });
        return;
      }
      const info = resp.data as { displayName?: string; mail?: string } | null;
      toast.success('Conexão com o Microsoft Graph ok', {
        description: info?.displayName
          ? `${info.displayName}${info.mail ? ` (${info.mail})` : ''}`
          : info?.mail,
      });
    } finally {
      setTestando(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="emailMarcador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail do usuário marcador de reuniões</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={EMAIL_MARCADOR_REUNIOES_PADRAO}
                  disabled={!podeEditar}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Caixa do Microsoft 365 usada pela API Graph para criar os convites
                Teams dos agendamentos técnicos e da Sala Arthur Saboya. Padrão:{' '}
                {EMAIL_MARCADOR_REUNIOES_PADRAO}. Participantes sempre incluem o
                e-mail da coordenadoria.
              </p>
              {inicial.atualizadoEm && (
                <p className="text-xs text-muted-foreground">
                  Última alteração
                  {inicial.atualizadoPorNome ? ` por ${inicial.atualizadoPorNome}` : ''}.
                </p>
              )}
            </FormItem>
          )}
        />
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={handleTestar} disabled={testando}>
              {testando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar Graph
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
