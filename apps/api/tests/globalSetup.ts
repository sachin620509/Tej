import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function setup() {
  if (process.env.TEST_MONGO_URI && !/^mongodb:\/\/(?:127\.0\.0\.1|localhost):27017\/?$/i.test(process.env.TEST_MONGO_URI)) {
    return;
  }

  const server = await MongoMemoryServer.create({
    instance: { dbName: 'instaframe_test_harness', launchTimeout: 60_000 },
  });

  process.env.TEST_MONGO_URI = server.getUri().replace(/\/$/, '');

  return async () => {
    await server.stop();
  };
}
