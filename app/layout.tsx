/** @format */

import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { ImpersonationProvider } from '@/providers/ImpersonationProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { DevClock } from '@/components/dev-clock';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const myFont = localFont({
	src: './Sora-VariableFont_wght.woff2',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Gerenciador de Agendamentos',
	description: 'Gerenciador de Agendamentos',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='pt-BR'
			suppressHydrationWarning
			className={`${myFont.className} antialiased `}>
			<body suppressHydrationWarning>
				<AuthProvider>
					<ImpersonationProvider>
						<QueryProvider>
							<ThemeProvider
							attribute='class'
							defaultTheme='system'
							enableSystem
							disableTransitionOnChange>
								{children}
								<Toaster richColors />
								<DevClock />
							</ThemeProvider>
						</QueryProvider>
					</ImpersonationProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
