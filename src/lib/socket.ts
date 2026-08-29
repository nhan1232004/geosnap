// Legacy socket stub - GeoSnap now uses direct Firestore listeners for realtime updates

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function getSocketStatus(): SocketStatus {
  return 'connected';
}

export function onSocketStatusChange(listener: (status: SocketStatus) => void): () => void {
  listener('connected');
  return () => {};
}

export function connectSocket(_token?: string): any {
  return null;
}

export function getSocket(): any {
  return null;
}

export function disconnectSocket(): void {}

export function joinConversation(_conversationId: string): void {}

export function leaveConversation(_conversationId: string): void {}

