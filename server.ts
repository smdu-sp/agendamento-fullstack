import 'dotenv/config';
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3001;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
	const httpServer = createServer((req, res) => {
		handle(req, res);
	});

	// Fase 6 vai popular esse servidor com os eventos do chat de pré-projetos
	// (equivalente ao PreProjetoChatGateway do backend). Por enquanto ele só
	// precisa subir sem conflitar com as rotas do Next.js.
	const io = new SocketIOServer(httpServer, {
		cors: { origin: corsOrigins },
	});

	io.on('connection', (socket) => {
		socket.on('disconnect', () => {});
	});

	httpServer.listen(port, () => {
		console.log(`> Ready on http://localhost:${port}`);
	});
});
