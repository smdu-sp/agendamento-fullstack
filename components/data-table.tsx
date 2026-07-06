/** @format */

'use client';

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/table';
import { Skeleton } from './ui/skeleton';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

export default function DataTable<TData, TValue>({
	columns,
	data,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});
	return (
		<div className='overflow-hidden rounded-[14px] border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
			<Table className='min-w-[780px] text-[14px]'>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							className='border-[#E5EAF2] hover:bg-transparent'
							key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											className='h-11 whitespace-nowrap bg-[#F8FAFC] px-3 text-[11.5px] font-semibold uppercase tracking-widest text-[#64748B]'
											key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
												  )}
										</TableHead>
									);
								})}
							</TableRow>
						))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								className='border-[#E5EAF2] hover:bg-[#F8FAFC]'
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										className='whitespace-nowrap px-3 py-2.5 text-[13.5px] text-[#0F172A]'>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow className='border-[#E5EAF2] hover:bg-transparent'>
							<TableCell
								colSpan={columns.length}
								className='py-10 text-center text-[#64748B]'>
								Sem resultados.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export function TableSkeleton() {
	return <Skeleton className='h-240 w-full rounded-xl' />;
}
