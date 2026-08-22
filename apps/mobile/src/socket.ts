import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN, getAccess } from './api';

let socket: Socket | undefined;

export function getMobileSocket() {
  if (!socket) {
    socket = io(API_ORIGIN, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5_000,
      timeout: 10_000,
      auth: callback => callback({ token: getAccess() }),
    });
  }
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
}

export function reconnectMobileSocket() {
  if (socket?.connected) return socket;
  socket?.disconnect();
  socket = undefined;
  return getMobileSocket();
}

export function closeMobileSocket() {
  socket?.disconnect();
  socket = undefined;
}
