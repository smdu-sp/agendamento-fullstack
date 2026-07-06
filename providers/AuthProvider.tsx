'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/agendamento";

export function AuthProvider({ children }: { children: ReactNode }) {
	return (
		<SessionProvider basePath={`${basePath}/api/auth`}>
			{children}
		</SessionProvider>
	);
}
