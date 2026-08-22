import type { Server } from 'socket.io';

let server: Server | undefined;

export function registerRealtimeServer(io: Server) {
  server = io;
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  server?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function emitToUsers(userIds: unknown[], event: string, payload: unknown) {
  for (const userId of userIds) server?.to(`user:${String(userId)}`).emit(event, payload);
}
