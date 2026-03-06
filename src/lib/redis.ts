import { Redis } from "ioredis";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined
});

connection.on("connect", () => {
    console.log("[Redis] Connected");
});

connection.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
});

export default connection;