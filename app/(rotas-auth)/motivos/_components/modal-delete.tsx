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
import * as motivo from '@/services/motivos';
import { Trash2, Check } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ModalDelete({
	id,
	status,
}: {
	id: string;
	status: boolean;
}) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	async function handleAction() {
		startTransition(() => {
			void (async () => {
				const resp = await motivo.desativar(id);
				if (resp.error) {
					toast.error('Algo deu errado', { description: resp.error });
				}
				if (resp.ok) {
					toast.success(status ? 'Motivo Desativado' : 'Motivo Ativado');
					router.refresh();
				}
			})();
		});
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					className={`${
						status
							? 'bg-destructive hover:bg-destructive hover:opacity-70'
							: 'bg-background hover:bg-primary'
					} group transition-all ease-linear duration-200`}>
					{status ? (
						<Check
							size={28}
							className='text-white group'
						/>
					) : (
						<Trash2
							size={28}
							className='text-destructive group-hover:text-white group'
						/>
					)}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{status ? 'Reativar motivo?' : 'Desativar motivo?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{status
							? 'Esta ação irá reativar o motivo de não atendimento.'
							: 'Esta ação irá desativar o motivo. Ele não será mais visível ao registrar não realização.'}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleAction}
						disabled={isPending}>
						{status ? 'Reativar' : 'Desativar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
