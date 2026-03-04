import IORedis from "ioredis";

/**
 * Shared Redis connection for BullMQ.
 *
 * Upstash Redis requirements:
 * - Uses `rediss://` (TLS) connection strings.
 * - `maxRetriesPerRequest: null` is required for BullMQ compatibility.
 * - `tls: {}` enables TLS when the URL scheme is `rediss://`.
 */
const redisUrl = process.env.REDIS_URL || "rediss://localhost:6379";

const connection = new IORedis.default(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
});

connection.on("connect", () => {
    console.log("[Redis] Connected to Upstash Redis");
});

connection.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
});

export default connection;
