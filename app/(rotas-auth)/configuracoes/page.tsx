/** @format */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buscarConfiguracaoReunioes } from '@/services/configuracoes';
import type { IConfiguracaoReunioes } from '@/types/configuracao';
import { FormConfiguracoes } from './_components/form-configuracoes';

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const permissao = String(session.usuario?.permissao || '');
  const podeVer = ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR'].includes(permissao);
  if (!podeVer) redirect('/');

  const podeEditar = ['ADM', 'DEV'].includes(permissao);
  const resp = await buscarConfiguracaoReunioes();
  const inicial: IConfiguracaoReunioes =
    resp.ok && resp.data && 'emailMarcador' in resp.data
      ? (resp.data as IConfiguracaoReunioes)
      : { emailMarcador: '', atualizadoEm: null, atualizadoPorNome: null };

  return (
    <AppPageShell title="Configurações" breadcrumbs={[{ label: 'Configurações' }]}>
      <Card className="max-w-2xl border-[#E5EAF2]">
        <CardHeader>
          <CardTitle>Reuniões Microsoft Teams</CardTitle>
          <CardDescription>
            O sistema cria as reuniões automaticamente pela Graph API, usando este e-mail como
            organizador. As credenciais da aplicação Azure ficam no ambiente
            (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormConfiguracoes inicial={inicial} podeEditar={podeEditar} />
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
