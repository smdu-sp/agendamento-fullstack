import { timingSafeEqual } from 'node:crypto';
import { sincronizarReunioesTeamsPendentes } from '@/lib/agendamentos-teams';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const segredo = process.env.TEAMS_SYNC_SECRET?.trim();
  const enviado = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const permitido = !!segredo && Buffer.byteLength(segredo) === Buffer.byteLength(enviado) &&
    timingSafeEqual(Buffer.from(segredo), Buffer.from(enviado));
  if (!permitido) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const resultado = await sincronizarReunioesTeamsPendentes(20);
  return Response.json(resultado);
}
