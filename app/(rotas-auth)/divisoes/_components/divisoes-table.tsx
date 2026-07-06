/** @format */

'use client';

import DataTable from '@/components/data-table';
import { IDivisao } from '@/types/divisao';
import { getColumns } from './columns';

export default function DivisoesTable({
	dados,
	podeExcluir,
}: {
	dados: IDivisao[];
	podeExcluir: boolean;
}) {
	return <DataTable columns={getColumns(podeExcluir)} data={dados || []} />;
}
