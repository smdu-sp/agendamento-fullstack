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
import { IDivisao } from '@/types/divisao';
import { Plus, SquarePen } from 'lucide-react';
import { useState } from 'react';
import FormDivisao from './form-divisao';

export default function ModalUpdateAndCreate({
	isUpdating,
	divisao,
}: {
	isUpdating: boolean;
	divisao?: Partial<IDivisao>;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size='icon'
					variant='outline'
					className={`${
						isUpdating
							? 'bg-background hover:bg-primary'
							: 'bg-primary hover:bg-primary hover:opacity-70'
					} group transition-all ease-linear duration-200`}>
					{isUpdating ? (
						<SquarePen size={28} className='text-primary group-hover:text-white' />
					) : (
						<Plus size={28} className='text-white' />
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Divisão</DialogTitle>
					<DialogDescription>Gerencie as informações da divisão</DialogDescription>
				</DialogHeader>
				<FormDivisao divisao={divisao} isUpdating={isUpdating} onClose={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
