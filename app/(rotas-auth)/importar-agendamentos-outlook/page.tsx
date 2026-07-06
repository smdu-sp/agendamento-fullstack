/** @format */

import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { IPermissao } from '@/types/usuario';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ImportarAgendamentosOutlookForm from './_components/importar-agendamentos-outlook-form';
import * as agendamento from '@/services/agendamentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function ImportarAgendamentosOutlookPage() {
	const session = await auth();
	if (!session) {
		redirect('/login');
	}

	const permissao = session.usuario?.permissao;
	const isAdm = permissao as unknown as IPermissao === IPermissao.ADM || permissao === 'ADM';
	const isDev = permissao as unknown as IPermissao === IPermissao.DEV || permissao === 'DEV';
	if (!isAdm && !isDev) {
		redirect('/');
	}

	let ultimaImportacao: { dataHora: string; total: number; usuarioNome?: string | null } | null = null;
	if (session.access_token) {
		const res = await agendamento.getUltimaImportacaoOutlook();
		if (res.ok && res.data) ultimaImportacao = res.data;
	}

	const dataUltima = ultimaImportacao?.dataHora
		? new Date(ultimaImportacao.dataHora)
		: null;

	return (
		<AppPageShell
			title='Importar Agendamentos Outlook'
			breadcrumbs={[{ label: 'Importar Outlook' }]}
		>
			{ultimaImportacao && dataUltima && (
				<div className='mb-5 p-4 rounded-lg border bg-muted/40 text-sm text-muted-foreground space-y-0.5'>
					<p>
						Data — {format(dataUltima, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
					</p>
					<p>{ultimaImportacao.total} agendamento(s) encontrado(s)</p>
					<p>
						Última importação: {format(dataUltima, "dd/MM/yyyy 'às' HH:mm")}
						{ultimaImportacao.usuarioNome
							? ` por ${ultimaImportacao.usuarioNome}`
							: ''}
					</p>
				</div>
			)}
			<div className='flex flex-col gap-5 my-5 w-full max-w-2xl'>
				<Card>
					<CardHeader>
						<CardTitle>Upload de Planilha Excel (Outlook)</CardTitle>
						<CardDescription>
							Planilha com estrutura: Linha 4 = cabeçalho, registros a partir da linha 5.
							<br />
							<span className='text-xs'>
								Colunas: A = Tipo de Atendimento, B = Visitante (munícipe), C = CPF, D = Horário, E = Técnico Responsável, F = Unidade, G = Número do Processo. Tamanho máximo: 10MB.
							</span>
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ImportarAgendamentosOutlookForm />
					</CardContent>
				</Card>
			</div>
		</AppPageShell>
	);
}
