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
import * as tipoAgendamentoService from '@/services/tipos-agendamento';
import { ITipoAgendamento } from '@/types/tipo-agendamento';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
	texto: z.string().min(3, 'Texto deve ter ao menos 3 caracteres'),
	status: z.boolean().optional(),
});

interface FormTipoAgendamentoProps {
	isUpdating: boolean;
	tipoAgendamento?: Partial<ITipoAgendamento>;
	onClose?: () => void;
}

export default function FormTipoAgendamento({
	isUpdating,
	tipoAgendamento: tipoData,
	onClose,
}: FormTipoAgendamentoProps) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			texto: tipoData?.texto || '',
			status: tipoData?.status ?? true,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				if (isUpdating && tipoData?.id) {
					const resp = await tipoAgendamentoService.atualizar(tipoData.id, {
						texto: values.texto,
						status: values.status,
					});

					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}

					if (resp.ok) {
						toast.success('Tipo de agendamento atualizado');
						router.refresh();
					}
				} else {
					const resp = await tipoAgendamentoService.criar({
						texto: values.texto,
						status: values.status ?? true,
					});
					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}
					if (resp.ok) {
						toast.success('Tipo de agendamento criado');
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
					name='texto'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Descrição do tipo</FormLabel>
							<FormControl>
								<Input
									placeholder='Ex: Vistoria, Licenciamento...'
									{...field}
								/>
							</FormControl>
							<FormMessage />
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
