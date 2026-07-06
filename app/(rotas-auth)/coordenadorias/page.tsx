/** @format */

import { Filtros } from '@/components/filtros';
import Pagination from '@/components/pagination';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { auth } from '@/lib/auth/auth';
import * as coordenadoria from '@/services/coordenadorias';
import { IPaginadoCoordenadoria, ICoordenadoria } from '@/types/coordenadoria';
import CoordenadoriasTable from './_components/coordenadorias-table';
import ModalUpdateAndCreate from './_components/modal-update-create';

export default async function CoordenadoriasSuspense({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return Coordenadorias({ searchParams });
}

async function Coordenadorias({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	let ok = false;
	const { busca = '', status = '' } = await searchParams;
	let dados: ICoordenadoria[] = [];

	const session = await auth();
	if (session && session.access_token) {
		const response = await coordenadoria.buscarTudo(
			+pagina,
			+limite,
			busca as string,
			status as string,
		);
		const { data } = response;
		ok = response.ok;
		if (ok) {
			if (data) {
				const paginado = data as IPaginadoCoordenadoria;
				pagina = paginado.pagina || 1;
				limite = paginado.limite || 10;
				total = paginado.total || 0;
				dados = paginado.data || [];
			}
		}
	}

		const podeCriar =
		session?.usuario?.permissao &&
		['ADM', 'DEV'].includes(String(session.usuario.permissao));
	const podeExcluir = podeCriar;

	const statusSelect = [
		{
			label: 'Ativo',
			value: 'ATIVO',
		},
		{
			label: 'Inativo',
			value: 'INATIVO',
		},
	];

	return (
		<AppPageShell title='Coordenadorias' breadcrumbs={[{ label: 'Coordenadorias' }]}>
			<div className='relative flex w-full flex-col gap-3 pb-20'>
				<Filtros
					camposFiltraveis={[
						{
							nome: 'Busca',
							tag: 'busca',
							tipo: 0,
							placeholder: 'Digite a sigla ou nome',
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
				<CoordenadoriasTable
					dados={dados || []}
					podeExcluir={!!podeExcluir}
				/>

				{Array.isArray(dados) && dados.length > 0 && (
					<Pagination
						total={+total}
						pagina={+pagina}
						limite={+limite}
					/>
				)}
			</div>
			{podeCriar && (
				<div className='absolute bottom-6 right-1 z-10 hover:scale-110 sm:right-2'>
					<ModalUpdateAndCreate isUpdating={false} />
				</div>
			)}
		</AppPageShell>
	);
}
