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
import * as usuarios from '@/services/usuarios';
import { IUsuario } from '@/types/usuario';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
	login: z.string(),
});

export default function FormBuscaUsuario() {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			login: '',
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { login } = values;
		const resp = await usuarios.buscarNovo(login);

		if (resp.error) {
			toast.error('Algo deu errado', { description: resp.error });
		}

		if (resp.ok && resp.data) {
			const usuario = resp.data as IUsuario;
			toast.success('Usuário encontrado', { description: usuario.nome });
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-4'>
				<FormField
					control={form.control}
					name='login'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Login de rede</FormLabel>
							<FormControl>
								<Input
									placeholder='Login do usuário'
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
						disabled={form.formState.isLoading || !form.formState.isValid}
						type='submit'>
						{form.formState.isLoading || form.formState.isSubmitting ? (
							<>
								Buscar <Loader2 className='animate-spin' />
							</>
						) : (
							<>
								Buscar <ArrowRight />
							</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
