/** @format */

import { Filtros } from '@/components/filtros';
import Pagination from '@/components/pagination';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { auth } from '@/lib/auth/auth';
import * as divisao from '@/services/divisoes';
import * as coordenadoria from '@/services/coordenadorias';
import { IPaginadoDivisao, IDivisao } from '@/types/divisao';
import { ICoordenadoria } from '@/types/coordenadoria';
import DivisoesTable from './_components/divisoes-table';
import ModalUpdateAndCreate from './_components/modal-update-create';

export default async function DivisoesSuspense({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	return Divisoes({ searchParams });
}

async function Divisoes({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let { pagina = 1, limite = 10, total = 0 } = await searchParams;
	const { busca = '', status = '', coordenadoriaId = '' } = await searchParams;
	let dados: IDivisao[] = [];
	let ok = false;

	const session = await auth();
	if (session?.access_token) {
		const response = await divisao.buscarTudo(
			+pagina,
			+limite,
			busca as string,
			status as string,
			coordenadoriaId as string,
		);
		ok = response.ok;
		if (ok && response.data) {
			const paginado = response.data as IPaginadoDivisao;
			pagina = paginado.pagina || 1;
			limite = paginado.limite || 10;
			total = paginado.total || 0;
			dados = paginado.data || [];
		}
	}

	const podeCriar =
		session?.usuario?.permissao &&
		['ADM', 'DEV'].includes(String(session.usuario.permissao));
	const podeExcluir = podeCriar;

	// Coordenadorias para filtro
	let coordenadorias: ICoordenadoria[] = [];
	if (session?.access_token) {
		const resp = await coordenadoria.listaCompleta();
		if (resp.ok && resp.data) coordenadorias = resp.data as ICoordenadoria[];
	}

	const statusSelect = [
		{ label: 'Ativa', value: 'ATIVO' },
		{ label: 'Inativa', value: 'INATIVO' },
	];

	const coordSelect = coordenadorias.map((c) => ({
		label: c.sigla + (c.nome ? ` — ${c.nome}` : ''),
		value: c.id,
	}));

	return (
		<AppPageShell title='Divisões' breadcrumbs={[{ label: 'Divisões' }]}>
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
						{
							nome: 'Coordenadoria',
							tag: 'coordenadoriaId',
							tipo: 2,
							valores: coordSelect,
						},
					]}
				/>
				<DivisoesTable dados={dados} podeExcluir={!!podeExcluir} />
				{Array.isArray(dados) && dados.length > 0 && (
					<Pagination total={+total} pagina={+pagina} limite={+limite} />
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
