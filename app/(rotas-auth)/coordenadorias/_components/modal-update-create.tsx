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
import { ICoordenadoria } from '@/types/coordenadoria';
import { Plus, SquarePen } from 'lucide-react';
import { useState } from 'react';
import FormCoordenadoria from './form-coordenadoria';

export default function ModalUpdateAndCreate({
	isUpdating,
	coordenadoria,
}: {
	isUpdating: boolean;
	coordenadoria?: Partial<ICoordenadoria>;
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
					<DialogTitle>{isUpdating ? 'Editar ' : 'Criar '}Coordenadoria</DialogTitle>
					<DialogDescription>
						Gerencie as informações da coordenadoria
					</DialogDescription>
				</DialogHeader>
				<FormCoordenadoria
					coordenadoria={coordenadoria}
					isUpdating={isUpdating}
					onClose={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
