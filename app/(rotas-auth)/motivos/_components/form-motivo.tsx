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
import * as motivo from '@/services/motivos';
import { IMotivo } from '@/types/motivo';
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

interface FormMotivoProps {
	isUpdating: boolean;
	motivo?: Partial<IMotivo>;
	onClose?: () => void;
}

export default function FormMotivo({
	isUpdating,
	motivo: motivoData,
	onClose,
}: FormMotivoProps) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			texto: motivoData?.texto || '',
			status: motivoData?.status ?? true,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				if (isUpdating && motivoData?.id) {
					const resp = await motivo.atualizar(motivoData.id, {
						texto: values.texto,
						status: values.status,
					});

					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}

					if (resp.ok) {
						toast.success('Motivo Atualizado');
						router.refresh();
					}
				} else {
					const resp = await motivo.criar({
						texto: values.texto,
						status: values.status ?? true,
					});
					if (resp.error) {
						toast.error('Algo deu errado', { description: resp.error });
					}
					if (resp.ok) {
						toast.success('Motivo Criado');
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
							<FormLabel>Texto do motivo de não atendimento</FormLabel>
							<FormControl>
								<Input
									placeholder='Ex: Cliente não compareceu'
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
