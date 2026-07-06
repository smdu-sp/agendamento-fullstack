/** @format */

'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { ITipoAgendamento } from '@/types/tipo-agendamento';
import { Plus, SquarePen } from 'lucide-react';
import { useState } from 'react';
import FormTipoAgendamento from './form-tipo-agendamento';

export default function ModalUpdateAndCreate({
	isUpdating,
	tipoAgendamento,
}: {
	isUpdating: boolean;
	tipoAgendamento?: Partial<ITipoAgendamento>;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size={'icon'}
					variant={'outline'}
					className={`${
						isUpdating
							? 'bg-background hover:bg-primary '
							: 'bg-primary hover:bg-primary hover:opacity-70'
					} group transition-all ease-linear duration-200`}>
					{isUpdating ? (
						<SquarePen
							size={28}
							className='text-primary group-hover:text-white group'
						/>
					) : (
						<Plus
							size={28}
							className='text-white group'
						/>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Tipo de Agendamento</DialogTitle>
					<DialogDescription>
						Gerencie os tipos de agendamento (ex.: Vistoria, Licenciamento)
					</DialogDescription>
				</DialogHeader>
				<FormTipoAgendamento
					tipoAgendamento={tipoAgendamento}
					isUpdating={isUpdating}
					onClose={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
