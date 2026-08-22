import { createClient, type RedisClientType } from 'redis';
import { RedisStore } from 'rate-limit-redis';
import { env } from './env.js';

let command: RedisClientType | undefined;
let publisher: RedisClientType | undefined;
let subscriber: RedisClientType | undefined;

function createRedisClient() {
  return createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 10_000,
      reconnectStrategy: false,
    },
  });
}

export function distributedRateLimitStore(prefix: string) {
  // Local development must remain usable when a free-tier Redis sleeps or resets.
  // Production still uses the distributed store and fails open only at middleware level.
  if (!env.REDIS_URL || env.NODE_ENV !== 'production') return undefined;
  command ??= createRedisClient();
  return new RedisStore({ sendCommand: (...args: string[]) => command!.sendCommand(args), prefix: `instaframe:rate:${prefix}:` });
}

export async function connectRedis() {
  if (!env.REDIS_URL || env.NODE_ENV !== 'production') return undefined;
  command ??= createRedisClient();
  publisher = command.duplicate();
  subscriber = command.duplicate();
  for (const client of [command, publisher, subscriber]) client.on('error', (error) => console.error('Redis error', error.message));
  await Promise.all([command.connect(), publisher.connect(), subscriber.connect()]);
  return { publisher, subscriber };
}

export async function disconnectRedis() {
  const clients = [subscriber, publisher, command].filter((client): client is RedisClientType => Boolean(client?.isOpen));
  await Promise.all(clients.map((client) => client.quit()));
}
