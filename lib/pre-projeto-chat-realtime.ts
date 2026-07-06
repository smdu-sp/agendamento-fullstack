import { io, type Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";

function getSocketBaseUrl() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return "";
  return apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
}

export function conectarChatPreProjetoTempoReal(
  referencia: string,
  onAtualizado: () => void,
): Socket | null {
  const baseUrl = getSocketBaseUrl();
  const ref = referencia.trim();
  if (!baseUrl || !ref) return null;

  const socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    socket.emit("preprojeto:join", { referencia: ref });
  });

  socket.on("preprojeto:atualizado", onAtualizado);

  return socket;
}
