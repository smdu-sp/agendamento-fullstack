/** @format */

import DataTable from '@/components/data-table';
import { Filtros } from '@/components/filtros';
import Pagination from '@/components/pagination';
import { auth } from '@/lib/auth/auth';
import * as tipoAgendamento from '@/services/tipos-agendamento';
import { IPaginadoTipoAgendamento, ITipoAgendamento } from '@/types/tipo-agendamento';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { columns } from './_components/columns';
import ModalUpdateAndCreate from './_components/modal-update-create';

export default async function TiposAgendamentoSuspense({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return TiposAgendamento({ searchParams });
}

async function TiposAgendamento({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	let ok = false;
	const { busca = '', status = '' } = await searchParams;
	let dados: ITipoAgendamento[] = [];

	const session = await auth();
	if (session && session.access_token) {
		const response = await tipoAgendamento.buscarTudo(
			+pagina,
			+limite,
			busca as string,
			status as string,
		);
		const { data } = response;
		ok = response.ok;
		if (ok && data) {
			const paginado = data as IPaginadoTipoAgendamento;
			pagina = paginado.pagina || 1;
			limite = paginado.limite || 10;
			total = paginado.total || 0;
			dados = paginado.data || [];
		}
	}

	const statusSelect = [
		{ label: 'Ativo', value: 'ATIVO' },
		{ label: 'Inativo', value: 'INATIVO' },
	];

	return (
		<AppPageShell title='Tipos de Agendamento' breadcrumbs={[{ label: 'Tipos de Agendamento' }]}>
			<div className='relative flex w-full flex-col gap-3 pb-20'>
				<Filtros
					camposFiltraveis={[
						{
							nome: 'Busca',
							tag: 'busca',
							tipo: 0,
							placeholder: 'Digite a descrição do tipo',
						},
						{
							nome: 'Status',
							tag: 'status',
							tipo: 2,
							valores: statusSelect,
							default: 'ATIVO',
						},
					]}
				/>
				<DataTable
					columns={columns}
					data={dados || []}
				/>

				{dados && dados.length > 0 && (
					<Pagination
						total={+total}
						pagina={+pagina}
						limite={+limite}
					/>
				)}
			</div>
			<div className='absolute bottom-6 right-1 z-10 hover:scale-110 sm:right-2'>
				<ModalUpdateAndCreate isUpdating={false} />
			</div>
		</AppPageShell>
	);
}
