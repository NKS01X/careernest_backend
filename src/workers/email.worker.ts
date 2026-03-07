import { Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";
import { connection } from "../lib/queue.js";
import { sendEmail } from "../services/email.service.js";

interface EmailPayload {
    email: string;
    subject: string;
    text: string;
    html?: string;
}

const emailWorker = new Worker<EmailPayload>(
    "email-notification-queue",
    async (bullJob: BullJob<EmailPayload>) => {
        const {
            email,
            subject,
            text,
            html,
        } = bullJob.data;

        console.log(
            `[EmailWorker] Sending email notification to ${email} (Subject: ${subject})`
        );

        const result = await sendEmail(email, subject, text, html);

        if (result.success) {
            console.log(
                `[EmailWorker] Email sent to ${email}: ${result.messageId}`
            );
        } else {
            throw new Error(`Failed to send email to ${email}`);
        }

        return { messageId: result.messageId, email };
    },
    {
        connection: connection as any,
        concurrency: 5,
        limiter: {
            max: 5,
            duration: 1000,
        },
    }
);

emailWorker.on("completed", (job) => {
    console.log(
        `[EmailWorker] Email notification ${job.id} sent successfully`
    );
});

emailWorker.on("failed", (job, err) => {
    console.error(
        `[EmailWorker] Email notification ${job?.id} failed (attempt ${job?.attemptsMade}):`,
        err.message
    );
});

console.log(
    "[EmailWorker] Started with rate limit: 5 msgs/sec, 3 retries with exponential backoff"
);

export default emailWorker;
