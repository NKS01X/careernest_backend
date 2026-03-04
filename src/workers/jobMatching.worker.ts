import { Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";
import { connection } from "../lib/queue.js";
import { whatsappNotificationQueue } from "../lib/queue.js";
import prisma from "../lib/db.js";

const top_cand = 10;

interface JobMatchingPayload {
    jobId: string;
}

interface MatchedCandidate {
    resumeId: string;
    userId: string;
    name: string;
    phone: string;
    distance: number;
}

interface JobRow {
    id: string;
    title: string;
    company: string;
    location: string | null;
    requiredExperience: number;
    embedding: string;
}

/**
 * BullMQ Worker for "job-matching-queue".
 *
 * 1. Fetches the Job and its embedding via raw SQL (embedding is Unsupported in Prisma).
 * 2. Runs a pgvector cosine similarity search against the Resume table,
 *    applying hard constraints (role = Student, location match, experience) FIRST.
 * 3. Enqueues top N matches into the whatsapp-notification-queue.
 */
const jobMatchingWorker = new Worker<JobMatchingPayload>(
    "job-matching-queue",
    async (bullJob: BullJob<JobMatchingPayload>) => {
        const { jobId } = bullJob.data;
        console.log(`[JobMatchingWorker] Processing job: ${jobId}`);

        // Fetch the job record + embedding via raw SQL
        const jobRows = await prisma.$queryRawUnsafe<JobRow[]>(
            `SELECT id, title, company, location, "requiredExperience", embedding::text
       FROM "Job"
       WHERE id = $1`,
            jobId
        );

        const job = jobRows[0];
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        if (!job.embedding) {
            throw new Error(`Job ${jobId} has no embedding`);
        }

        //    Perform filtered cosine similarity search
        //    Hard constraints are applied in the WHERE clause BEFORE sorting by similarity.
        //    This lets pgvector indexes work efficiently after pre-filtering.
        const matches = await prisma.$queryRawUnsafe<MatchedCandidate[]>(
            `
      SELECT
        r.id        AS "resumeId",
        r."userId"  AS "userId",
        u.name      AS "name",
        u.phone     AS "phone",
        r.embedding <=> $1::vector AS distance
      FROM "Resume" r
      JOIN "User" u ON u.id = r."userId"
      WHERE u.role = 'Student'
        AND r.embedding IS NOT NULL
        AND ($2::text IS NULL OR r.location = $2)
        AND r."yearsOfExperience" >= $3
      ORDER BY distance ASC
      LIMIT $4
      `,
            job.embedding,
            job.location ?? null,
            job.requiredExperience,
            top_cand
        );

        console.log(
            `[JobMatchingWorker] Found ${matches.length} matching candidates for job "${job.title}"`
        );

        //  Enqueue each match for WhatsApp notification
        for (const match of matches) {
            await whatsappNotificationQueue.add("send-notification", {
                jobId: job.id,
                jobTitle: job.title,
                jobCompany: job.company,
                jobLocation: job.location,
                userId: match.userId,
                userName: match.name,
                phone: match.phone,
                similarityScore: 1 - match.distance,
            });
        }

        console.log(
            `[JobMatchingWorker] Enqueued ${matches.length} notifications for job "${job.title}"`
        );

        return { matched: matches.length };
    },
    {
        connection: connection as any,
        concurrency: 5,
    }
);

jobMatchingWorker.on("completed", (job) => {
    console.log(`[JobMatchingWorker] Job ${job.id} completed:`, job.returnvalue);
});

jobMatchingWorker.on("failed", (job, err) => {
    console.error(`[JobMatchingWorker] Job ${job?.id} failed:`, err.message);
});

export default jobMatchingWorker;
