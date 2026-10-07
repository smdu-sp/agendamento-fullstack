/** @format */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { AgendaTecnicosPanel } from './_components/agenda-tecnicos-panel';

export default async function AgendaTecnicosPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const permissao = String(session.usuario?.permissao || '');
  const podeVer = ['ADM', 'DEV', 'PONTO_FOCAL', 'COORDENADOR', 'DIRETOR'].includes(permissao);
  if (!podeVer) redirect('/');

  return (
    <AppPageShell title="Agenda dos técnicos" breadcrumbs={[{ label: 'Agenda dos técnicos' }]}>
      <AgendaTecnicosPanel />
    </AppPageShell>
  );
}
