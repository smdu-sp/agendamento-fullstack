/** @format */

'use server';

import { revalidateTag } from 'next/cache';
import { IRespostaAgendamento } from '@/types/agendamento';
import { requireUsuarioOuRedirect, verificarPermissoes, AuthzError } from '@/lib/authz';
import { importarPlanilhaDeBuffer } from '@/lib/agendamentos-import';

const MIME_EXCEL = new Set([
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-excel',
	'application/excel',
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function importarPlanilha(formData: FormData): Promise<IRespostaAgendamento> {
	const usuario = await requireUsuarioOuRedirect();

	try {
		verificarPermissoes(usuario, ['ADM', 'DEV']);

		const arquivo = formData.get('arquivo');
		if (!(arquivo instanceof File) || arquivo.size === 0) {
			return { ok: false, error: 'Arquivo não fornecido', data: null, status: 400 };
		}
		if (arquivo.size > MAX_SIZE) {
			return { ok: false, error: 'Arquivo excede o limite de 10MB.', data: null, status: 400 };
		}
		if (arquivo.type && !MIME_EXCEL.has(arquivo.type)) {
			return { ok: false, error: 'Apenas arquivos Excel (.xlsx, .xls) são permitidos.', data: null, status: 400 };
		}

		const coordenadoriaIdRaw = formData.get('coordenadoriaId');
		const coordenadoriaId = typeof coordenadoriaIdRaw === 'string' && coordenadoriaIdRaw ? coordenadoriaIdRaw : undefined;

		const buffer = Buffer.from(await arquivo.arrayBuffer());
		const resultado = await importarPlanilhaDeBuffer(buffer, coordenadoriaId, usuario.id);

		revalidateTag('agendamentos');
		return { ok: true, error: null, data: resultado, status: 200 };
	} catch (error) {
		if (error instanceof AuthzError) {
			return { ok: false, error: error.message, data: null, status: error.status };
		}
		const errorMessage = error instanceof Error ? error.message : 'Erro ao importar planilha';
		return { ok: false, error: errorMessage, data: null, status: 500 };
	}
}
