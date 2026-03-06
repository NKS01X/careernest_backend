import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("REDIS_URL is not set in .env — cannot connect to Redis");
}

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
    },
    reconnectOnError(err: Error) {
        console.log("[Redis] Reconnecting due to error:", err.message);
        return true;
    },
    keepAlive: 30000,
});

connection.on("connect", () => {
    console.log("[Redis] Connected");

    // Keep Upstash Redis warm to avoid cold start latency
    // Pinging every 30 seconds (2880 pings/day, well within the 10k free tier limit)
    setInterval(() => {
        if (connection.status === "ready") {
            connection.ping().catch(() => { });
        }
    }, 30000);
});

connection.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
});

export default connection;