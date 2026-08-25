import { io, Socket } from 'socket.io-client';
import { logError } from './errorHandler';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

let socket: Socket | null = null;
let currentStatus: SocketStatus = 'disconnected';
const statusListeners = new Set<(status: SocketStatus) => void>();

function setStatus(status: SocketStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.error('[Socket] Error in status listener:', e);
    }
  });
}

export function getSocketStatus(): SocketStatus {
  return currentStatus;
}

export function onSocketStatusChange(listener: (status: SocketStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing if any
  if (socket) {
    socket.disconnect();
  }

  setStatus('connecting');

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server successfully');
    setStatus('connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected from server:', reason);
    setStatus('disconnected');
    if (reason === 'io server disconnect') {
      // the disconnection was initiated by the server, need to reconnect manually
      socket?.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
    setStatus('error');
    logError(err, 'SocketConnectError');
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] Reconnect attempt #${attempt}`);
    setStatus('connecting');
  });

  socket.io.on('reconnect_failed', () => {
    const errorMsg = '[Socket] Reconnection failed after max attempts';
    console.error(errorMsg);
    setStatus('error');
    logError(new Error(errorMsg), 'SocketReconnectFailed');
  });

  socket.io.on('reconnect_error', (err) => {
    console.warn('[Socket] Reconnect error:', err.message);
    logError(err, 'SocketReconnectError');
  });

  socket.on('error', (err) => {
    console.error('[Socket] Generic socket error:', err);
    logError(err, 'SocketGeneralError');
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    setStatus('disconnected');
  }
}

export function joinConversation(conversationId: string) {
  if (socket?.connected) {
    socket.emit('join-conversation', conversationId);
  } else if (socket) {
    socket.once('connect', () => {
      socket?.emit('join-conversation', conversationId);
    });
  }
}

export function leaveConversation(conversationId: string) {
  if (socket?.connected) {
    socket.emit('leave-conversation', conversationId);
  }
}
