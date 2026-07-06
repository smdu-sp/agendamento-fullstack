/** @format */

import { DrawerMenu } from '@/components/drawer-menu';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
	SidebarInset,
	SidebarProvider,
} from '@/components/ui/sidebar';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export default async function RotasAuth({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	if (!session) redirect('/login');
	const sidebar = await AppSidebar({});
	return (
		<div className='relative w-full'>
			<SidebarProvider>
				{sidebar}
				<SidebarInset>
					<div className='h-full w-full items-center gap-4 bg-muted/50 p-4 dark:bg-background sm:pt-0'>
						{children}
					</div>
				</SidebarInset>
				<DrawerMenu />
			</SidebarProvider>
		</div>
	);
}
