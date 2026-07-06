/** @format */

import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function BigNumbers({ numbers }: { numbers: number[] }) {
	const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
	return (
		<ul className='flex flex-col md:flex-row items-center justify-between gap-5'>
			<li className='w-full'>
				<Card>
					<CardHeader>
						<CardTitle className='text-2xl'>
							{numbers[0].toLocaleString('pt-BR')}
						</CardTitle>
						<CardDescription>Total de agendamentos no ano atual ({ new Date().getFullYear() }) </CardDescription>
					</CardHeader>
				</Card>
			</li>
			<li className='w-full'>
				<Card>
					<CardHeader>
						<CardTitle className='text-2xl'>
							{numbers[1].toLocaleString('pt-BR')}
						</CardTitle>
						<CardDescription>
							Total de agendamentos no mês atual ({ meses[new Date().getMonth()] })
						</CardDescription>
					</CardHeader>
				</Card>
			</li>
			<li className='w-full'>
				<Card>
					<CardHeader>
						<CardTitle className='text-2xl'>
							{numbers[2].toLocaleString('pt-BR')}
						</CardTitle>
						<CardDescription>Total de agendamentos hoje ({ new Date().toLocaleDateString('pt-BR') })</CardDescription>
					</CardHeader>
				</Card>
			</li>
		</ul>
	);
}
