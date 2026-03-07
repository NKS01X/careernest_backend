import { Queue } from "bullmq";
import connection from "./redis.js";

export const jobMatchingQueue = new Queue("job-matching-queue", {
    connection: connection as any,
});

export const emailNotificationQueue = new Queue("email-notification-queue", {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
    },
});

export { connection };
