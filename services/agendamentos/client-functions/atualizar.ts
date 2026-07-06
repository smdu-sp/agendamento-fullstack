/** @format */

'use client';

import { IUpdateAgendamento, IRespostaAgendamento } from '@/types/agendamento';
import { atualizar as atualizarServer } from '../server-functions/atualizar';

/**
 * Wrapper client-side que chama a Server Action de atualização.
 * O parâmetro `_accessToken` é mantido apenas por compatibilidade com os
 * pontos de chamada existentes (a autenticação agora é resolvida no servidor).
 */
export async function atualizar(
	id: string,
	data: IUpdateAgendamento,
	_accessToken?: string,
): Promise<IRespostaAgendamento> {
	return atualizarServer(id, data);
}
