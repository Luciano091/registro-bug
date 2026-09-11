export type OperationEvent = {
  tipo: string;
  pedido_id?: number;
  enviado_em?: string;
};

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const socketUrl = `${apiBase.replace(/^http/, 'ws').replace(/\/$/, '')}/ws/operacao`;

export function connectOperationStream(
  onEvent: (event: OperationEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
) {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let heartbeat: number | null = null;
  let stopped = false;
  let attempt = 0;

  const clearHeartbeat = () => {
    if (heartbeat !== null) window.clearInterval(heartbeat);
    heartbeat = null;
  };

  const connect = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || stopped) return;
    socket = new WebSocket(socketUrl);
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ token }));
      heartbeat = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
      }, 25000);
    });
    socket.addEventListener('message', message => {
      if (message.data === 'pong') return;
      try {
        const event = JSON.parse(message.data) as OperationEvent;
        if (event.tipo === 'conectado') {
          attempt = 0;
          onConnectionChange?.(true);
          return;
        }
        onEvent(event);
      } catch {
        // Ignora mensagens que não pertencem ao protocolo operacional.
      }
    });
    socket.addEventListener('close', () => {
      clearHeartbeat();
      onConnectionChange?.(false);
      if (stopped) return;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5));
      reconnectTimer = window.setTimeout(connect, delay);
    });
    socket.addEventListener('error', () => socket?.close());
  };

  connect();
  return () => {
    stopped = true;
    clearHeartbeat();
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
