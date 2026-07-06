/** @format */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	basePath: "/agendamento",
	// Sem output "standalone": o custom server (server.ts) hospeda o Next.js
	// junto com o Socket.IO, e "standalone" não é compatível com custom servers.
	outputFileTracingRoot: __dirname,
	env: {
		NEXT_PUBLIC_BASE_PATH: '/agendamento'
	},
	/* config options here */
	experimental: {
		serverActions: {
			bodySizeLimit: '10mb',
		},
	},
	allowedDevOrigins: [
		'10.20.4.6',
		'127.0.0.1',
	],
};

export default nextConfig;
