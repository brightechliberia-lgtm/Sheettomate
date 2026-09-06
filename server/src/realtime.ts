import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { logger } from './config/logger';

type Client = WebSocket & { userId?: string };

const rooms = new Map<string, Set<Client>>();

function join(room: string, ws: Client) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(ws);
}

function leaveAll(ws: Client) {
  for (const set of rooms.values()) set.delete(ws);
}

export function publish(room: string, payload: unknown) {
  const data = JSON.stringify(payload);
  rooms.get(room)?.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

export function publishToUser(userId: string, payload: unknown) {
  publish(`user:${userId}`, payload);
}

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (socket, req) => {
    const ws = socket as Client;
    try {
      const url = new URL(req.url ?? '/ws', 'http://localhost');
      const token = url.searchParams.get('token') ?? '';
      const payload = jwt.verify(token, env.jwtAccessSecret) as { sub: string; type?: string };
      if (payload.type && payload.type !== 'access') throw new Error('bad token');
      ws.userId = payload.sub;
      join(`user:${payload.sub}`, ws);
      join('community', ws);
      ws.send(JSON.stringify({ type: 'hello', userId: payload.sub }));
    } catch {
      ws.close(4401, 'Unauthorized');
      return;
    }
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; room?: string };
        if (msg.type === 'join' && typeof msg.room === 'string' && msg.room.startsWith('template:')) {
          join(msg.room, ws);
        }
      } catch {
        /* ignore */
      }
    });
    ws.on('close', () => leaveAll(ws));
  });
  logger.info('WebSocket /ws attached');
}
