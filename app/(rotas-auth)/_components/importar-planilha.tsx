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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import * as agendamento from '@/services/agendamentos';
import * as coordenadoria from '@/services/coordenadorias';
import { ICoordenadoria } from '@/types/coordenadoria';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTransition, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
	arquivo: z.instanceof(File, { message: 'Por favor, selecione um arquivo' })
		.refine(
			(file) => file.size > 0,
			'O arquivo não pode estar vazio',
		)
		.refine(
			(file) => file.size <= 10 * 1024 * 1024,
			'Arquivo deve ter no máximo 10MB',
		)
		.refine(
			(file) => {
				const validTypes = [
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'application/vnd.ms-excel',
					'application/excel',
				];
				const validExtensions = ['.xlsx', '.xls'];
				const fileName = file.name.toLowerCase();
				return validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));
			},
			'Apenas arquivos Excel (.xlsx, .xls) são permitidos',
		),
	coordenadoriaId: z.string().optional(),
});

export default function ImportarPlanilha() {
	const [isPending, startTransition] = useTransition();
	const [coordenadorias, setCoordenadorias] = useState<ICoordenadoria[]>([]);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const { data: session } = useSession();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			coordenadoriaId: '',
		},
	});

	useEffect(() => {
		async function carregarCoordenadorias() {
			if (session?.access_token) {
				const resp = await coordenadoria.listaCompleta();
				if (resp.ok && resp.data) {
					setCoordenadorias(resp.data as ICoordenadoria[]);
				}
			}
		}
		carregarCoordenadorias();
	}, [session]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		startTransition(() => {
			void (async () => {
				try {
					const formData = new FormData();
					formData.append('arquivo', values.arquivo);
					if (values.coordenadoriaId) {
						formData.append('coordenadoriaId', values.coordenadoriaId);
					}

					const resp = await agendamento.importarPlanilha(formData);

					if (resp.error) {
						toast.error('Erro ao importar planilha', {
							description: resp.error,
							duration: 5000,
						});
						return;
					}

					if (resp.ok && resp.data) {
						const resultado = resp.data as {
							importados: number;
							erros: number;
							duplicados?: number;
						};

						if (resultado.importados > 0) {
							toast.success('Planilha importada com sucesso', {
								description: `${resultado.importados} agendamento(s) importado(s) com sucesso.${resultado.duplicados ? ` ${resultado.duplicados} já existiam.` : ''}${resultado.erros > 0 ? ` ${resultado.erros} linha(s) com erro(s) foram ignoradas.` : ''}`,
								duration: 5000,
							});
						} else if (resultado.duplicados && resultado.duplicados > 0) {
							toast.warning('Nenhum agendamento novo importado', {
								description: `${resultado.duplicados} registro(s) já existiam no sistema (mesmo processo e data/hora).`,
								duration: 5000,
							});
						} else {
							toast.warning('Nenhum agendamento importado', {
								description: resultado.erros > 0
									? `${resultado.erros} linha(s) não puderam ser lidas. Confira data/hora, processo e e-mails.`
									: 'Nenhum dado válido encontrado na planilha.',
								duration: 5000,
							});
						}

						setOpen(false);
						form.reset();
						router.refresh();
					}
				} catch (error) {
					console.error('Erro ao importar planilha:', error);
					toast.error('Erro inesperado', {
						description: 'Ocorreu um erro ao processar a importação. Tente novamente.',
						duration: 5000,
					});
				}
			})();
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Upload className='mr-2 h-4 w-4' />
					Importar Planilha
				</Button>
			</DialogTrigger>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Importar Planilha de Agendamentos</DialogTitle>
					<DialogDescription>
						Selecione o arquivo Excel (.xlsx ou .xls) com os agendamentos a serem importados.
						<br />
						<span className='text-xs text-muted-foreground'>
							Tamanho máximo: 10MB. A planilha deve conter as colunas: RF, Munícipe, RG, CPF, Processo, Data/Hora, Resumo.
						</span>
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-4'>
						<FormField
							control={form.control}
							name='arquivo'
							render={({ field: { value, onChange, ...fieldProps } }) => {
								const file = value as File | undefined;
								return (
									<FormItem>
										<FormLabel>Arquivo Excel *</FormLabel>
										<FormControl>
											<div className='space-y-2'>
												<Input
													{...fieldProps}
													type='file'
													accept='.xlsx,.xls'
													onChange={(event) => {
														const selectedFile = event.target.files?.[0];
														if (selectedFile) {
															onChange(selectedFile);
														}
													}}
													className='cursor-pointer'
												/>
												{file && (
													<div className='text-sm text-muted-foreground p-2 bg-muted rounded-md'>
														<p className='font-medium'>{file.name}</p>
														<p className='text-xs'>
															{(file.size / 1024 / 1024).toFixed(2)} MB
														</p>
													</div>
												)}
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							control={form.control}
							name='coordenadoriaId'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Coordenadoria (Opcional)</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Selecione uma coordenadoria (opcional)' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value=''>Nenhuma</SelectItem>
											{coordenadorias.map((coord) => (
												<SelectItem key={coord.id} value={coord.id}>
													{coord.sigla}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
									<p className='text-xs text-muted-foreground'>
										Se selecionada, todos os agendamentos importados serão associados a esta coordenadoria.
									</p>
								</FormItem>
							)}
						/>
						<div className='flex gap-2 items-center justify-end pt-4'>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setOpen(false);
									form.reset();
								}}
								disabled={isPending}>
								Cancelar
							</Button>
							<Button
								disabled={isPending || !form.formState.isValid}
								type='submit'
								className='min-w-[120px]'>
								{isPending ? (
									<>
										<span className='flex items-center gap-2'>
											<Loader2 className='animate-spin h-4 w-4' />
											Importando...
										</span>
									</>
								) : (
									<>
										<span className='flex items-center gap-2'>
											<Upload className='h-4 w-4' />
											Importar
										</span>
									</>
								)}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
