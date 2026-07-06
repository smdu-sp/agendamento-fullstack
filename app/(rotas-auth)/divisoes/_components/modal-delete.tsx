/** @format */

'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import * as divisao from '@/services/divisoes';
import { Trash2, Check } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ModalDelete({ id, status }: { id: string; status: boolean }) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const isAtiva = status;
	const vaiReativar = !isAtiva;

	async function handleAction() {
		startTransition(() => {
			void (async () => {
				const resp = await divisao.desativar(id);
				if (resp.error) toast.error('Algo deu errado', { description: resp.error });
				if (resp.ok) {
					toast.success(vaiReativar ? 'Divisão Ativada' : 'Divisão Desativada');
					router.refresh();
				}
			})();
		});
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					size='icon'
					variant='outline'
					className={`${
						isAtiva
							? 'bg-background hover:bg-primary'
							: 'bg-destructive hover:bg-destructive hover:opacity-70'
					} group transition-all ease-linear duration-200`}>
					{isAtiva ? (
						<Trash2 size={28} className='text-destructive group-hover:text-white group' />
					) : (
						<Check size={28} className='text-white' />
					)}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{vaiReativar ? 'Reativar Divisão?' : 'Desativar Divisão?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{vaiReativar
							? 'Esta ação irá reativar a divisão.'
							: 'Esta ação irá desativar a divisão. Ela não será mais visível em listagens.'}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction onClick={handleAction} disabled={isPending}>
						{vaiReativar ? 'Reativar' : 'Desativar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
