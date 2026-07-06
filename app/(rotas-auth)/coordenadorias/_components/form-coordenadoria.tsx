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
import * as coordenadoria from '@/services/coordenadorias';
import { ICoordenadoria } from '@/types/coordenadoria';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
	sigla: z.string().min(2, 'Sigla deve ter ao menos 2 caracteres'),
	nome: z.string().optional(),
	email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
	status: z.boolean().optional(),
});

interface FormCoordenadoriaProps {
	isUpdating: boolean;
	coordenadoria?: Partial<ICoordenadoria>;
	onClose?: () => void;
}

export default function FormCoordenadoria({
	isUpdating,
	coordenadoria: coord,
	onClose,
}: FormCoordenadoriaProps) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			sigla: coord?.sigla || '',
			nome: coord?.nome || '',
			email: coord?.email || '',
			status: coord?.status ?? true,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				if (isUpdating && coord?.id) {
					const resp = await coordenadoria.atualizar(coord.id, {
						sigla: values.sigla,
						nome: values.nome,
						email: values.email || undefined,
						status: values.status,
					});

					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}

					if (resp.ok) {
						toast.success('Coordenadoria Atualizada');
						router.refresh();
					}
				} else {
					const resp = await coordenadoria.criar({
						sigla: values.sigla,
						nome: values.nome,
						email: values.email || undefined,
						status: values.status ?? true,
					});
					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}
					if (resp.ok) {
						toast.success('Coordenadoria Criada');
						router.refresh();
						onClose?.();
					}
				}
			})();
		});
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-4'>
				<FormField
					control={form.control}
					name='sigla'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Sigla</FormLabel>
							<FormControl>
								<Input
									placeholder='Ex: COHAB, SMUL'
									{...field}
								/>
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
								<Input
									placeholder='Nome completo da coordenadoria'
									{...field}
									value={field.value || ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='email'
					render={({ field }) => (
						<FormItem>
							<FormLabel>E-mail da coordenadoria (Opcional)</FormLabel>
							<FormControl>
								<Input
									type='email'
									placeholder='ex: smulsuporte@prefeitura.sp.gov.br'
									{...field}
									value={field.value || ''}
								/>
							</FormControl>
							<FormMessage />
							<p className='text-xs text-muted-foreground'>
								Usado no Outlook para enviar o convite de reunião (quem envia é a coordenadoria).
							</p>
						</FormItem>
					)}
				/>
				<div className='flex gap-2 items-center justify-end'>
					<DialogClose asChild>
						<Button variant={'outline'}>Voltar</Button>
					</DialogClose>
					<Button
						disabled={isPending}
						type='submit'>
						{isUpdating ? (
							<>
								Atualizar {isPending && <Loader2 className='animate-spin' />}
							</>
						) : (
							<>
								Adicionar {isPending && <Loader2 className='animate-spin' />}
							</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
