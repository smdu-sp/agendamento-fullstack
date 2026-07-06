/** @format */

'use client';

import { IDivisao } from '@/types/divisao';
import { ColumnDef } from '@tanstack/react-table';
import ModalUpdateCreate from './modal-update-create';
import ModalDelete from './modal-delete';
import { Badge } from '@/components/ui/badge';

export function getColumns(podeExcluir: boolean): ColumnDef<IDivisao>[] {
	return [
		{
			accessorKey: 'sigla',
			header: 'Sigla',
		},
		{
			accessorKey: 'nome',
			header: 'Nome',
			cell: ({ row }) => row.original.nome || '-',
		},
		{
			accessorKey: 'coordenadoria',
			header: 'Coordenadoria',
			cell: ({ row }) => row.original.coordenadoria?.sigla || '-',
		},
		{
			accessorKey: 'status',
			header: () => <p className='text-center'>Status</p>,
			cell: ({ row }) => {
				const status = row.original.status;
				return (
					<div className='flex items-center justify-center'>
						<Badge variant={status ? 'default' : 'destructive'}>
							{status ? 'Ativa' : 'Inativa'}
						</Badge>
					</div>
				);
			},
		},
		{
			accessorKey: 'actions',
			header: () => <p className='text-center'>Ações</p>,
			cell: ({ row }) => (
				<div className='flex gap-2 items-center justify-center' key={row.id}>
					<ModalUpdateCreate divisao={row.original} isUpdating={true} />
					{podeExcluir && (
						<ModalDelete status={row.original.status} id={row.original.id} />
					)}
				</div>
			),
		},
	];
}
