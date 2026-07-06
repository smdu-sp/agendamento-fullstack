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
import * as agendamentoClient from '@/services/agendamentos/client-functions';
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
	type StatusOpcao = '' | 'AGENDADO' | 'ATENDIDO' | 'NAO_REALIZADO';
	const [statusSelecionado, setStatusSelecionado] = useState<StatusOpcao>('');
	const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
	const [motivos, setMotivos] = useState<IMotivo[]>([]);

	const ehEdicao = agendamento.status === 'ATENDIDO' || agendamento.status === 'NAO_REALIZADO';

	// Inicializa: na edição, preenche com o status atual (ATENDIDO ou NAO_REALIZADO)
	useEffect(() => {
		if (ehEdicao) {
			setStatusSelecionado(agendamento.status as 'ATENDIDO' | 'NAO_REALIZADO');
			if (agendamento.status === 'NAO_REALIZADO') {
				const id = agendamento.motivoNaoAtendimentoId || agendamento.motivoNaoAtendimento?.id || '';
				setMotivoSelecionado(id);
			} else {
				setMotivoSelecionado('');
			}
		} else {
			setStatusSelecionado('');
			setMotivoSelecionado('');
		}
	}, [ehEdicao, agendamento.status, agendamento.motivoNaoAtendimentoId, agendamento.motivoNaoAtendimento?.id]);

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
			const payload =
				statusSelecionado === 'AGENDADO'
					? { status: StatusAgendamento.AGENDADO }
					: statusSelecionado === 'ATENDIDO'
					? { status: StatusAgendamento.ATENDIDO }
					: { status: StatusAgendamento.NAO_REALIZADO, motivoNaoAtendimentoId: motivoSelecionado };

			const response = await agendamentoClient.atualizar(agendamento.id, payload, session.access_token);

			if (response.error) {
				toast.error(response.error);
			} else {
				const msg =
					statusSelecionado === 'AGENDADO'
						? 'Revertido para Agendado. O técnico poderá confirmar novamente.'
						: statusSelecionado === 'ATENDIDO'
						? ehEdicao ? 'Alterado para Atendido.' : 'Atendimento confirmado.'
						: ehEdicao ? 'Alterado para Não Realizado.' : 'Não realização registrada.';
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
								{ehEdicao && (
									<SelectItem value='AGENDADO'>
										Agendado (reverter confirmação — ex.: confirmou o agendamento errado)
									</SelectItem>
								)}
								<SelectItem value='ATENDIDO'>Atendido</SelectItem>
								<SelectItem value='NAO_REALIZADO'>Não realizado</SelectItem>
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
