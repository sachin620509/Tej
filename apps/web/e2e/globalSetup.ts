import http from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createServer as createViteServer } from 'vite';

export default async function globalSetup() {
  const externalUri = process.env.E2E_MONGO_URI?.trim();
  const memory = externalUri ? undefined : await MongoMemoryServer.create({ instance: { dbName: 'instaframe_e2e', launchTimeout: 60_000 } });
  const mongoUri = externalUri ?? memory!.getUri('instaframe_e2e');
  process.env.NODE_ENV = 'test'; process.env.PORT = '4100'; process.env.MONGO_URI = mongoUri; process.env.CLIENT_URL = 'http://127.0.0.1:5180'; process.env.ADMIN_URL = 'http://127.0.0.1:5174'; process.env.EMAIL_DELIVERY_MODE = 'disabled'; process.env.REDIS_URL = ''; process.env.VITE_API_PROXY_TARGET = 'http://127.0.0.1:4100';
  const [{ app }, { attachSockets }] = await Promise.all([import('../../api/src/app.js'), import('../../api/src/sockets/index.js')]);
  await mongoose.connect(mongoUri, { dbName: 'instaframe_e2e' });
  const api = http.createServer(app), io = attachSockets(api);
  await new Promise<void>(resolve => api.listen(4100, '127.0.0.1', resolve));
  const vite = await createViteServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 5180, strictPort: true } });
  await vite.listen();
  return async () => {
    io.close();
    await vite.close();
    await new Promise<void>(resolve => api.close(() => resolve()));
    await mongoose.disconnect();
    await memory?.stop();
  };
}
