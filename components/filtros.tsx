/** @format */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Check, ChevronsUpDown, RefreshCw, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useTransition } from 'react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn, verificaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';

interface CampoFiltravel {
	nome: string;
	tag: string;
	tipo: TiposFiltros;
	default?: string;
	valores?: CampoSelect[] | CampoDataRange
	placeholder?: string
}

export enum TiposFiltros {
	TEXTO,
	DATA,
	SELECT,
	AUTOCOMPLETE
}

interface CampoSelect {
	value: string | number;
	label: string;
}

interface CampoDataRange {
	modo: 'unico' | 'intervalo';
}

interface FiltrosProps {
	camposFiltraveis?: CampoFiltravel[];
}

export function Filtros({ camposFiltraveis }: FiltrosProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	
	const [isPending, startTransition] = useTransition();
	const [filtros, setFiltros] = useState<{ [key: string]: string }>(
		camposFiltraveis ? camposFiltraveis.reduce((acc, item) => ({ ...acc, [item.tag]: item.default || '' }), {}): {}
	);

	useEffect(() => {
		atualizaFiltros();
	}, []);

	useEffect(() => {
		for (const [key, value] of searchParams) {
			setFiltros((prev) => ({
				...prev,
				[key]: value,
			}));
		}
	}, [searchParams]);

	function atualizaFiltros() {
		let urlParams = '';
		for (const [key, value] of Object.entries(filtros)) {
			urlParams += `${key}=${value}&`;
		}
		router.push(`${pathname}?${urlParams}`);
	}

	function limpaFiltros() {
		setFiltros(camposFiltraveis ? camposFiltraveis.reduce((acc, item) => ({ ...acc, [item.tag]: '' }), {}) : {});
		router.push(pathname);
	}

	function renderFiltros() {
		const filtros = [];
		if (camposFiltraveis) {
			for (const campo of camposFiltraveis) {
				switch (campo.tipo) {
					case TiposFiltros.TEXTO:
						filtros.push(RenderTexto(campo));
						break;
					case TiposFiltros.DATA:
						filtros.push(RenderDataRange(campo));
						break;
					case TiposFiltros.SELECT:
						filtros.push(RenderSelect(campo));
						break;
					case TiposFiltros.AUTOCOMPLETE:
						filtros.push(RenderAutocomplete(campo));
						break;
				}
			}
		}
		return filtros;
	  }

	function RenderTexto(campo: CampoFiltravel) {
		return (
			<div
				className='relative min-w-0 flex-1'
				key={campo.tag}>
				<Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]' />
				<Input
					value={filtros[campo.tag]}
					onChange={(e) =>
						setFiltros((prev) => ({ ...prev, [campo.tag]: e.target.value }))
					}
					className='h-10 rounded-lg border-[#D7DFEA] bg-white pl-9 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:border-[#0A328D]/40 focus-visible:ring-[#0A328D]/15'
					placeholder={campo.placeholder || campo.nome}
				/>
			</div>
		);
	}

	function RenderSelect(campo: CampoFiltravel) {
		// Radix Select exige que `value` coincida com um SelectItem; string vazia quebra a abertura do menu.
		const bruto = filtros[campo.tag];
		const opcoes = (campo.valores as CampoSelect[]) || [];
		let valorSelect =
			bruto !== undefined && bruto !== null && String(bruto).trim() !== '' ? String(bruto) : 'all';
		if (valorSelect !== 'all' && !opcoes.some((o) => String(o.value) === valorSelect)) {
			valorSelect = 'all';
		}

		return (
			<div
				className='min-w-[180px]'
				key={campo.tag}>
				<Select
					onValueChange={(value) =>
						setFiltros((prev) => ({
							...prev,
							[campo.tag]: value === 'all' ? '' : value,
						}))
					}
					value={valorSelect}>
					<SelectTrigger className='h-10 rounded-lg border-[#D7DFEA] bg-white text-[13px] text-[#0F172A]'>
						<SelectValue placeholder={campo.placeholder || campo.nome} />
					</SelectTrigger>
					<SelectContent position='popper' className='z-50'>
						<SelectItem
							value='all'
							className='text-nowrap'>
							Tudo
						</SelectItem>
						{opcoes.length > 0 &&
							opcoes.map((item) => {
								return (
									<SelectItem
										key={item.value}
										value={item.value.toString()}>
										{item.label}
									</SelectItem>
								);
							})}
					</SelectContent>
				</Select>
			</div>
		);
	}

	function RenderAutocomplete(campo: CampoFiltravel) {
		const [open, setOpen] = useState(false);
		const [value, setValue] = useState(campo.default || '');
		const valores = campo.valores as CampoSelect[] || [];
		return <div className='min-w-[180px]' key={campo.tag}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="h-10 min-w-[180px] justify-between rounded-lg border-[#D7DFEA] bg-white text-[13px] text-[#0F172A]"
					>
					{value
						? valores.find((opcao) => opcao.label === value)?.label
						: campo.placeholder || campo.nome }
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[260px] p-0">
					<Command>
						<CommandInput placeholder="Buscar opção" />
						<CommandList>
							<CommandEmpty>Opção não encontrada</CommandEmpty>
							<CommandGroup>
								{valores.map((opcao) => (
									<CommandItem
										key={opcao.value}
										value={opcao.value.toString()}
										onSelect={(currentValue) => {
											setValue(currentValue === value ? "" : currentValue);
											setFiltros((prev) => ({ ...prev, [campo.tag]: value }));
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												value === opcao.value ? "opacity-100" : "opacity-0"
											)}
										/>
										{opcao.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
				</Popover>
		</div>
	}

	function RenderDataRange(campo: CampoFiltravel) {
		const param = searchParams.get(campo.tag);
		const datas = param ? param.split(',') : ['', ''];

		const [from, to] = verificaData(datas[0], datas[1]);
		const [date, setDate] = useState<DateRange | undefined>(datas[0] !== ''  && datas[1] !== '' ? { from, to } : undefined);

		function handleSelecionaData(date: DateRange | undefined) {
			setDate(date);
			const from = date?.from ? format(date.from, 'dd-MM-yyyy') : '';
			const to = date?.to ? format(date.to, 'dd-MM-yyyy') : '';
			const periodo = from !== '' && to !== '' ? `${from},${to}` : '';
			if (periodo === '') toast.error('Selecione um período para filtrar por data');
			setFiltros((prev) => ({ ...prev, [campo.tag]: periodo }));
		}

		useEffect(() => {
			const paramUpdate = searchParams.get(campo.tag);
			const datas = paramUpdate && paramUpdate !== '' ? paramUpdate.split(',') : ['', ''];
			const [from, to] = verificaData(datas[0], datas[1]);
			setDate(datas[0] !== '' && datas[1] !== '' ? { from, to } : undefined);
		}, [searchParams]);

		return (
			<div className='min-w-[220px]' key={campo.tag}>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							id='date'
							variant={'outline'}
							className={cn(
								'h-10 w-full justify-start rounded-lg border-[#D7DFEA] bg-white text-left text-[13px] font-normal text-[#0F172A]',
								!date && 'text-muted-foreground',
							)}>
							{date && date.from ? (
								date.to ? (
									<>
										{format(date.from, 'LLL dd, y', {
											locale: ptBR,
										})}{' '}
										-{' '}
										{format(date.to, 'LLL dd, y', {
											locale: ptBR,
										})}
									</>
								) : (
									format(date.from, 'LLL dd, y', {
										locale: ptBR,
									})
								)
							) : (
								<span>Escolha uma data</span>
							)}
							<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date && date.from}
						selected={date}
						onSelect={handleSelecionaData}
						numberOfMonths={2}
					/>
					</PopoverContent>
				</Popover>
			</div>
		);
	}

	return (
		<div className='mb-3.5 flex flex-wrap items-end gap-2.5 gap-y-3'>
			<div className='flex min-w-[min(100%,240px)] flex-1 flex-wrap items-center gap-2'>
				{renderFiltros()}
			</div>
			<div className='isolate flex shrink-0 gap-2'>
				<Button
					variant='outline'
					className='h-10 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]'
					disabled={isPending}
					onClick={() => startTransition(() => atualizaFiltros())}
					title='Aplicar filtros'>
					<RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
					Buscar
				</Button>
				<Button
					variant='outline'
					disabled={isPending}
					className='h-10 gap-2 rounded-lg border-[#D7DFEA] bg-transparent px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] sm:text-[13px]'
					onClick={() => startTransition(() => limpaFiltros())}
					title='Limpar filtros'>
					<X className='h-4 w-4' />
					Limpar
				</Button>
			</div>
		</div>
	);
}
