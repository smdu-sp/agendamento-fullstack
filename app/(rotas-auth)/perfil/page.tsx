/** @format */

import { AvatarUploader } from '@/components/avatar-uploader';
import { AppPageShell } from '@/components/layout/app-page-shell';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { auth } from '@/lib/auth/auth';
import { buscarMeuUsuario } from '@/services/usuarios/query-functions/meu-usuario';
import { IUsuario } from '@/types/usuario';
import { redirect } from 'next/navigation';
import FormProfile from './components/form-profile';

export default async function Perfil() {
	const session = await auth();

	if (!session) {
		redirect(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/login`);
	}

	const data = await buscarMeuUsuario();
	const { data: user, ok, error } = data;
	if (!ok || !user) {
		console.log(error);
		return <div>Usuário não encontrado</div>;
	}

	const userData = user as Partial<IUsuario>;

	return (
		<AppPageShell title='Perfil' breadcrumbs={[{ label: 'Perfil' }]}>
			<div className='grid grid-cols-1 gap-8 my-5 md:grid-cols-3'>
				{/* Avatar section */}
				<Card className='md:col-span-1 h-full '>
					<CardHeader>
						<CardTitle className='text-base md:text-xl flex items-center gap-5 justify-between'>
							{userData.nome}
							{userData.permissao && <Badge>{userData.permissao}</Badge>}
						</CardTitle>
					</CardHeader>
					<CardContent className='bg-card rounded-xl flex justify-center items-center mb-5 h-full'>
						<AvatarUploader
							avatarUrl={userData.avatar ?? ''}
							id={session?.usuario.sub}
						/>
					</CardContent>
				</Card>

				{/* Profile details */}
				<div className='md:col-span-2'>
					<Card>
						<CardHeader>
							<CardTitle className='text-base md:text-xl'>
								Informações Pessoais
							</CardTitle>
							<CardDescription>
								Apenas o nome social pode ser editado
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<FormProfile
								user={userData}
								id={session?.usuario.sub}
							/>
						</CardContent>
					</Card>
				</div>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className='text-base md:text-xl'>
						Atividade Recente
					</CardTitle>
				</CardHeader>
				<CardContent>
					{userData.ultimoLogin &&
						userData.criadoEm &&
						userData.atualizadoEm && (
							<>
								<div className='flex flex-col md:flex-row justify-start md:gap-3 md:items-center p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors'>
									<span>Usuário criado em:</span>
									<span className='text-sm text-muted-foreground'>
										{new Date(userData?.criadoEm).toLocaleString('pt-BR')}
									</span>
								</div>
								<div className='flex flex-col md:flex-row justify-start md:gap-3 md:items-center p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors'>
									<span>Usuário atualizado em:</span>
									<span className='text-sm text-muted-foreground'>
										{new Date(userData.atualizadoEm).toLocaleString('pt-BR')}
									</span>
								</div>
								<div className='flex flex-col md:flex-row justify-start md:gap-3 md:items-center p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors'>
									<span>Último Login:</span>
									<span className='text-sm text-muted-foreground'>
										{new Date(userData.ultimoLogin).toLocaleString('pt-BR')}
									</span>
								</div>
							</>
						)}
				</CardContent>
			</Card>
		</AppPageShell>
	);
}
