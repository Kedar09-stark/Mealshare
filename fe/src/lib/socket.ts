import { io, Socket } from 'socket.io-client';
import { API_BASE, getToken } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  // Return existing socket if already initialized and connected
  if (socket && socket.connected) return socket;
  
  // Reconnect if socket exists but disconnected
  if (socket && !socket.connected) {
    console.debug('Socket exists but disconnected, reconnecting...');
    socket.connect();
    return socket;
  }

  // Initialize new socket connection
  console.debug('Initializing new WebSocket connection to:', API_BASE);
  const token = getToken();
  socket = io(API_BASE, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
    reconnectionAttempts: 100,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected, socket ID:', socket?.id);
  });

  socket.on('connect_error', (err: any) => {
    console.warn('WebSocket connect_error:', err && err.message ? err.message : err);
  });

  socket.on('error', (err: any) => {
    console.warn('WebSocket error:', err);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('WebSocket disconnected, reason:', reason);
  });

  try { (window as any).__socket = socket; } catch {}

  return socket;
}

export function closeSocket() {
  if (socket) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
}
