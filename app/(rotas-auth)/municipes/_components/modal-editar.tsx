/** @format */

'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import * as municipe from '@/services/municipes';
import { IMunicipe } from '@/types/municipe';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, SquarePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
	nome: z.string().trim().min(1, 'Informe o nome completo'),
	email: z.string().trim().email('Informe um e-mail válido'),
});

export default function ModalEditar({ municipe: dados }: { municipe: IMunicipe }) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { nome: dados.nome, email: dados.email },
	});

	function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				const resp = await municipe.atualizar(dados.id, values);
				if (!resp.ok) {
					toast.error('Algo deu errado', { description: resp.error });
					return;
				}
				toast.success('Munícipe atualizado');
				setOpen(false);
				router.refresh();
			})();
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					title='Editar'
					className='bg-background hover:bg-primary group transition-all ease-linear duration-200'>
					<SquarePen size={28} className='text-primary group-hover:text-white group' />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar Munícipe</DialogTitle>
					<DialogDescription>
						Corrija o nome ou o e-mail de acesso ao portal.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='nome'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome</FormLabel>
									<FormControl>
										<Input {...field} />
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
									<FormLabel>E-mail</FormLabel>
									<FormControl>
										<Input type='email' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className='flex gap-2 items-center justify-end'>
							<DialogClose asChild>
								<Button variant={'outline'}>Voltar</Button>
							</DialogClose>
							<Button disabled={isPending} type='submit'>
								Salvar {isPending && <Loader2 className='animate-spin' />}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
