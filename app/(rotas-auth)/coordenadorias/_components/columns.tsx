/** @format */

'use client';

import { ICoordenadoria } from '@/types/coordenadoria';
import { ColumnDef } from '@tanstack/react-table';
import ModalUpdateCreate from './modal-update-create';
import ModalDelete from './modal-delete';
import { Badge } from '@/components/ui/badge';

export function getColumns(podeExcluir: boolean): ColumnDef<ICoordenadoria>[] {
  return [
	{
		accessorKey: 'sigla',
		header: 'Sigla',
	},
	{
		accessorKey: 'nome',
		header: 'Nome',
		cell: ({ row }) => {
			return row.original.nome || '-';
		},
	},
	{
		accessorKey: 'email',
		header: 'E-mail',
		cell: ({ row }) => {
			return row.original.email || '-';
		},
	},
	{
		accessorKey: 'status',
		header: () => <p className='text-center'>Status</p>,
		cell: ({ row }) => {
			const status = row.original.status;
			return (
				<div className='flex items-center justify-center'>
					<Badge variant={`${status == false ? 'destructive' : 'default'}`}>
						{status ? 'Ativo' : 'Inativo'}
					</Badge>
				</div>
			);
		},
	},
	{
		accessorKey: 'actions',
		header: () => <p className='text-center'>Ações</p>,
		cell: ({ row }) => {
			return (
				<div
					className='flex gap-2 items-center justify-center'
					key={row.id}>
					<ModalUpdateCreate
						coordenadoria={row.original}
						isUpdating={true}
					/>
					{podeExcluir && (
						<ModalDelete
							status={!row.original.status}
							id={row.original.id}
						/>
					)}
				</div>
			);
		},
	},
  ];
}
