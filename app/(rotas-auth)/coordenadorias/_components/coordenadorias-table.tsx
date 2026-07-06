/** @format */

'use client';

import DataTable from '@/components/data-table';
import { ICoordenadoria } from '@/types/coordenadoria';
import { getColumns } from './columns';

export default function CoordenadoriasTable({
	dados,
	podeExcluir,
}: {
	dados: ICoordenadoria[];
	podeExcluir: boolean;
}) {
	return (
		<DataTable columns={getColumns(podeExcluir)} data={dados || []} />
	);
}
