const { MongoClient } = require("mongodb");

require("dotenv").config({ path: ".env" });

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is missing");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});

(async () => {
  try {
    console.log("Testing MongoDB connection...");

    await client.connect();

    console.log("MongoDB TCP/TLS/auth connection successful!");

    const result = await client
      .db()
      .command({ ping: 1 });

    console.log("MongoDB ping:", result);
  } catch (error) {
    console.error("MongoDB connection FAILED");
    console.error("Name:", error.name);
    console.error("Code:", error.code);
    console.error("Message:", error.message);

    if (error.cause) {
      console.error("Cause:", error.cause);
    }
  } finally {
    await client.close().catch(() => {});
  }
})();