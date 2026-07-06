/** @format */

'use client';

import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import * as divisao from '@/services/divisoes';
import * as coordenadoria from '@/services/coordenadorias';
import { IDivisao } from '@/types/divisao';
import { ICoordenadoria } from '@/types/coordenadoria';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
	sigla: z.string().min(2, 'Sigla deve ter ao menos 2 caracteres'),
	nome: z.string().optional(),
	coordenadoriaId: z.string().optional(),
	status: z.boolean().optional(),
});

interface FormDivisaoProps {
	isUpdating: boolean;
	divisao?: Partial<IDivisao>;
	onClose?: () => void;
}

export default function FormDivisao({ isUpdating, divisao: div, onClose }: FormDivisaoProps) {
	const [isPending, startTransition] = useTransition();
	const [coordenadorias, setCoordenadorias] = useState<ICoordenadoria[]>([]);
	const { data: session } = useSession();
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			sigla: div?.sigla || '',
			nome: div?.nome || '',
			coordenadoriaId: div?.coordenadoriaId || '',
			status: div?.status ?? true,
		},
	});

	useEffect(() => {
		async function carregar() {
			const resp = await coordenadoria.listaCompleta();
			if (resp.ok && resp.data) setCoordenadorias(resp.data as ICoordenadoria[]);
		}
		carregar();
	}, [session]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				if (isUpdating && div?.id) {
					const resp = await divisao.atualizar(div.id, {
						sigla: values.sigla,
						nome: values.nome || undefined,
						coordenadoriaId: values.coordenadoriaId || undefined,
						status: values.status,
					});
					if (resp.error) toast.error('Algo deu errado', { description: resp.error });
					if (resp.ok) {
						toast.success('Divisão atualizada');
						router.refresh();
					}
				} else {
					const resp = await divisao.criar({
						sigla: values.sigla,
						nome: values.nome || undefined,
						coordenadoriaId: values.coordenadoriaId || undefined,
						status: values.status ?? true,
					});
					if (resp.error) toast.error('Algo deu errado', { description: resp.error });
					if (resp.ok) {
						toast.success('Divisão criada');
						router.refresh();
						onClose?.();
					}
				}
			})();
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				<FormField
					control={form.control}
					name='sigla'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Sigla</FormLabel>
							<FormControl>
								<Input placeholder='Ex: DEINFO, DGEO' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='nome'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome Completo (Opcional)</FormLabel>
							<FormControl>
								<Input placeholder='Nome completo da divisão' {...field} value={field.value || ''} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='coordenadoriaId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Coordenadoria</FormLabel>
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Selecione a coordenadoria' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{coordenadorias.map((coord) => (
										<SelectItem key={coord.id} value={coord.id}>
											{coord.sigla}{coord.nome ? ` — ${coord.nome}` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='flex gap-2 items-center justify-end'>
					<DialogClose asChild>
						<Button variant='outline'>Voltar</Button>
					</DialogClose>
					<Button disabled={isPending} type='submit'>
						{isUpdating ? (
							<>Atualizar {isPending && <Loader2 className='animate-spin' />}</>
						) : (
							<>Adicionar {isPending && <Loader2 className='animate-spin' />}</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
