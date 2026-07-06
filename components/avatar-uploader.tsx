/** @format */

'use client';

import type React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Link, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { atualizar } from '@/services/usuarios';
import { useSession } from 'next-auth/react';
import { IUsuario } from '@/types/usuario';

interface AvatarUploaderProps {
	avatarUrl: string;
	id: string;
}

export function AvatarUploader({ avatarUrl, id }: AvatarUploaderProps) {
	const [inputUrl, setInputUrl] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [showUrlInput, setShowUrlInput] = useState(false);
	const { data: session, update } = useSession();

	const handleUrlSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputUrl.trim()) return;

		setIsValidating(true);
		try {
			const resp = await atualizar(id, { avatar: inputUrl });

			if (!resp.ok) {
				toast.error('Algo deu errado');
			} else {
				if (session?.usuario && resp.data) {
					const dataResp = resp.data as IUsuario;
					// Você precisará ajustar isso de acordo com a estrutura da sua sessão e da resposta da API
					const updateSession = await update({
						...session,
						usuario: {
							...session?.usuario,
							avatar: dataResp.avatar,
						},
					});
					console.log('Sessão atualizada:', updateSession); // Para depuração
				}
				window.location.reload();
			}
			// Se você tiver uma função específica para atualizar a sessão
			// await updateSession(updatedSession);

			toast.success('Avatar atualizado com sucesso');
		} catch (error) {
			console.log(error);
			toast.error('Algo deu errado');
		} finally {
			setIsValidating(false);
		}
	};

	return (
		<div className='flex flex-col items-center'>
			<div className='relative'>
				<div className='relative w-52 h-52 rounded-full overflow-hidden border-4 border-primary/30 transition-colors duration-300'>
					{avatarUrl ? (
						/*  eslint-disable-next-line @next/next/no-img-element */
						<img
							width={160}
							height={160}
							src={avatarUrl}
							alt='Avatar do usuário'
							className='w-full h-full object-cover placeholder:hidden '
						/>
					) : (
						<div className='absolute inset-0 bg-muted/10 flex items-center justify-center'>
							<div className='text-center text-primary'>
								<Link className='w-8 h-8 mx-auto mb-2 ' />
								<p className='text-sm'>Alterar URL</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{showUrlInput ? (
				<form
					className='mt-6 w-full'
					onSubmit={handleUrlSubmit}>
					<div className='flex gap-2'>
						<Input
							type='url'
							placeholder='Cole a URL da imagem'
							value={inputUrl}
							onChange={(e) => setInputUrl(e.target.value)}
							className='flex-1'
							disabled={isValidating}
						/>
						<Button
							type='submit'
							size='icon'
							disabled={isValidating}>
							{isValidating ? (
								<RefreshCw className='h-4 w-4 animate-spin' />
							) : (
								<Check className='h-4 w-4' />
							)}
						</Button>
					</div>
					<p className='text-xs text-muted-foreground mt-2 text-center'>
						Insira uma URL válida de imagem (jpg, png, gif, etc)
					</p>
				</form>
			) : (
				<div className='mt-6 flex gap-2'>
					<Button
						size='sm'
						className='flex items-center gap-1'
						onClick={() => setShowUrlInput(true)}>
						<Link className='h-4 w-4' />
						<span>Definir URL</span>
					</Button>
				</div>
			)}
		</div>
	);
}
