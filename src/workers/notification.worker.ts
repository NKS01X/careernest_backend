import { Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";
import { connection } from "../lib/queue.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";

interface NotificationPayload {
    type: string;
    userId: string;
    userName: string;
    phone: string;
    message: string;
}

/**
 * BullMQ Worker for "whatsapp-notification-queue".
 *
 * Configured with:
 * - Rate limiting: max 10 jobs per 1 second
 * - Exponential backoff: 3 retries with 2s initial delay
 */
const notificationWorker = new Worker<NotificationPayload>(
    "whatsapp-notification-queue",
    async (bullJob: BullJob<NotificationPayload>) => {
        const {
            type,
            userName,
            phone,
            message,
        } = bullJob.data;

        console.log(
            `[NotificationWorker] Sending ${type} notification to ${userName} (${phone})`
        );

        const result = await sendWhatsAppMessage(phone, message);

        console.log(
            `[NotificationWorker] Message sent to ${userName}: ${result.messageId}`
        );

        return { messageId: result.messageId, phone };
    },
    {
        connection: connection as any,
        concurrency: 5,
        limiter: {
            max: 5,
            duration: 1000, // 5 messages per second (respects third-party API limits)
        },
    }
);

notificationWorker.on("completed", (job) => {
    console.log(
        `[NotificationWorker] Notification ${job.id} sent successfully`
    );
});

notificationWorker.on("failed", (job, err) => {
    console.error(
        `[NotificationWorker] Notification ${job?.id} failed (attempt ${job?.attemptsMade}):`,
        err.message
    );
});

console.log(
    "[NotificationWorker] Started with rate limit: 5 msgs/sec, 3 retries with exponential backoff"
);

export default notificationWorker;
