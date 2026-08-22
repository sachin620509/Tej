import http from 'node:http';
import dns from 'node:dns';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { startMediaCleanupWorker } from './jobs/mediaCleanup.js';
import { startStoryExpiryWorker } from './jobs/storyExpiry.js';
import { startOperationsWorker } from './jobs/operations.js';
import { attachSockets } from './sockets/index.js';

function configureDns() {
  const resolvers = env.DNS_SERVERS.length
    ? env.DNS_SERVERS
    : ['8.8.8.8', '1.1.1.1'];

  dns.setServers(resolvers);

  console.warn(
    `Using configured DNS resolvers: ${resolvers.join(', ')}`
  );
}

type DnsJsonAnswer = { type: number; data: string };
type DnsJsonResponse = { Answer?: DnsJsonAnswer[] };

async function resolveMongoUriOverHttps(source: string) {
  const url = new URL(source);
  if (url.protocol !== 'mongodb+srv:') return source;
  const query = async (name: string, type: 'SRV' | 'TXT') => {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`DNS-over-HTTPS returned ${response.status}`);
    return response.json() as Promise<DnsJsonResponse>;
  };
  const [srv, txt] = await Promise.all([
    query(`_mongodb._tcp.${url.hostname}`, 'SRV'),
    query(url.hostname, 'TXT'),
  ]);
  const hosts = (srv.Answer ?? []).filter(answer => answer.type === 33).map(answer => {
    const parts = answer.data.trim().split(/\s+/);
    const port = parts.at(-2);
    const host = parts.at(-1)?.replace(/\.$/, '');
    if (!host || !port || !/^\d+$/.test(port)) throw new Error('Invalid MongoDB SRV response');
    return `${host}:${port}`;
  });
  if (!hosts.length) throw new Error('No MongoDB hosts returned by DNS-over-HTTPS');
  const params = new URLSearchParams(url.searchParams);
  for (const answer of (txt.Answer ?? []).filter(value => value.type === 16)) {
    const value = answer.data.replace(/^"|"$/g, '');
    for (const [key, entry] of new URLSearchParams(value)) if (!params.has(key)) params.set(key, entry);
  }
  params.set('tls', 'true');
  const credentials = url.username ? `${url.username}${url.password ? `:${url.password}` : ''}@` : '';
  return `mongodb://${credentials}${hosts.join(',')}${url.pathname}?${params.toString()}`;
}

async function resolveMongoUri() {
  if (!env.MONGO_URI.startsWith('mongodb+srv://')) return env.MONGO_URI;
  const host = new URL(env.MONGO_URI).hostname;
  const srvRecord = `_mongodb._tcp.${host}`;

  try {
    const records = await dns.promises.resolveSrv(srvRecord);

    if (!records.length) {
      throw new Error(`No MongoDB SRV records found for ${srvRecord}`);
    }

    console.warn(`MongoDB SRV DNS resolved (${records.length} hosts)`);
    return env.MONGO_URI;
  } catch (error) {
    console.warn('MongoDB SRV DNS resolution failed; trying encrypted DNS fallback');
    const fallback = await resolveMongoUriOverHttps(env.MONGO_URI);
    console.warn('MongoDB DNS-over-HTTPS fallback resolved successfully');
    return fallback;
  }
}

async function connectMongo(uri: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.warn(`Connecting to MongoDB (attempt ${attempt}/3)...`);

      await mongoose.connect(uri, {
        dbName: 'instaframe',
        serverSelectionTimeoutMS: 15_000,
        connectTimeoutMS: 15_000,
        socketTimeoutMS: 30_000,
        family: 4,
      });

      console.warn('MongoDB connected successfully');

      return;
    } catch (error) {
      lastError = error;

      console.error(
        `MongoDB connection attempt ${attempt} failed:`,
        error instanceof Error ? error.message : error
      );

      await mongoose.disconnect().catch(() => undefined);

      if (attempt < 3) {
        console.warn('Retrying MongoDB connection...');
        await new Promise(resolve =>
          setTimeout(resolve, attempt * 1500)
        );
      }
    }
  }

  throw lastError;
}

async function start() {
  // IMPORTANT:
  // Configure Node DNS BEFORE mongoose.connect().
  configureDns();

  const mongoUri = await resolveMongoUri();

  // Connect MongoDB only after DNS is confirmed.
  await connectMongo(mongoUri);

  const redis = await connectRedis();

  const { app } = await import('./app.js');

  const server = http.createServer(app);

  const io = attachSockets(server, redis);

  const stopCleanup = startMediaCleanupWorker();
  const stopStoryExpiry = startStoryExpiryWorker();
  const stopOperations = startOperationsWorker();

  server.listen(env.PORT, () => {
    console.warn(`InstaFrame API listening on ${env.PORT}`);
  });

  const shutdown = async () => {
    stopCleanup();
    stopStoryExpiry();
    stopOperations();

    await new Promise<void>(resolve =>
      io.close(() => resolve())
    );

    server.close();

    await Promise.all([
      mongoose.disconnect(),
      disconnectRedis(),
    ]);

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

start().catch(error => {
  console.error('API failed to start');

  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exit(1);
});
