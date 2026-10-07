'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { IAgendamento, StatusAgendamento } from '@/types/agendamento';
import { atualizar } from '@/services/agendamentos/server-functions';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import * as motivoService from '@/services/motivos';
import { IMotivo } from '@/types/motivo';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface ConfirmarAtendimentoProps {
	agendamento: IAgendamento;
	onClose: () => void;
	onSuccess: () => void;
}

export default function ConfirmarAtendimento({
	agendamento,
	onClose,
	onSuccess,
}: ConfirmarAtendimentoProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	type StatusOpcao = '' | 'ATENDIDO' | 'NAO_REALIZADO' | 'CONCLUIDO';
	const [statusSelecionado, setStatusSelecionado] = useState<StatusOpcao>('');
	const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
	const [motivos, setMotivos] = useState<IMotivo[]>([]);

	const ehEdicao = agendamento.status === 'ATENDIDO';

	useEffect(() => {
		setStatusSelecionado('');
		setMotivoSelecionado('');
	}, [agendamento.status]);

	// Carrega motivos quando seleciona Não realizado
	useEffect(() => {
		if (statusSelecionado === 'NAO_REALIZADO' && motivos.length === 0 && session?.access_token) {
			motivoService.listaCompleta().then((r) => {
				if (r.ok && r.data) setMotivos(r.data as IMotivo[]);
			});
		}
	}, [statusSelecionado, motivos.length, session?.access_token]);

	const handleConfirmar = async () => {
		if (!session?.access_token) {
			toast.error('Não autorizado');
			return;
		}
		if (!statusSelecionado) {
			toast.error('Selecione o status');
			return;
		}
		if (statusSelecionado === 'NAO_REALIZADO' && !motivoSelecionado) {
			toast.error('Selecione um motivo para não realização.');
			return;
		}

		setIsLoading(true);
		try {
			const payload = statusSelecionado === 'ATENDIDO'
				? { status: StatusAgendamento.ATENDIDO }
				: statusSelecionado === 'CONCLUIDO'
				? { status: StatusAgendamento.CONCLUIDO }
				: { status: StatusAgendamento.NAO_REALIZADO, motivoNaoAtendimentoId: motivoSelecionado };

			const response = await atualizar(agendamento.id, payload);

			if (response.error) {
				toast.error(response.error);
			} else {
				const msg = statusSelecionado === 'CONCLUIDO' ? 'Atendimento concluído.'
					: statusSelecionado === 'ATENDIDO' ? 'Atendimento confirmado.' : 'Não realização registrada.';
				toast.success(msg);
				onSuccess();
				onClose();
				router.refresh();
			}
		} catch {
			toast.error('Erro ao salvar.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[500px]'>
				<DialogHeader>
					<DialogTitle>Alterar status do atendimento</DialogTitle>
					<DialogDescription>
						Selecione o status do atendimento para {agendamento.municipe || 'N/A'}.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 py-4'>
					<div className='space-y-2'>
						<label className='text-sm font-medium'>Status</label>
						<Select
							value={statusSelecionado || undefined}
							onValueChange={(v) => setStatusSelecionado((v || '') as StatusOpcao)}>
							<SelectTrigger>
								<SelectValue placeholder='Selecione o status...' />
							</SelectTrigger>
							<SelectContent>
								{ehEdicao ? <SelectItem value='CONCLUIDO'>Concluído</SelectItem> : null}
								{!ehEdicao ? <SelectItem value='ATENDIDO'>Atendido</SelectItem> : null}
								{!ehEdicao ? <SelectItem value='NAO_REALIZADO'>Não realizado</SelectItem> : null}
							</SelectContent>
						</Select>
					</div>

					{statusSelecionado === 'NAO_REALIZADO' && (
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Motivo da não realização</label>
							<Select value={motivoSelecionado || undefined} onValueChange={setMotivoSelecionado}>
								<SelectTrigger>
									<SelectValue placeholder='Selecione um motivo...' />
								</SelectTrigger>
								<SelectContent>
									{motivos.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											{m.texto}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={onClose} disabled={isLoading}>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirmar}
						disabled={isLoading || !statusSelecionado || (statusSelecionado === 'NAO_REALIZADO' && !motivoSelecionado)}>
						Confirmar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
