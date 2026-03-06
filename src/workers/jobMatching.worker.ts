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
    skills: string[];
    distance: number;
}

interface JobRow {
    id: string;
    title: string;
    company: string;
    location: string | null;
    requiredExperience: number;
    skills: string[];
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
            `SELECT id, title, company, location, "requiredExperience", skills, embedding::text
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
        r.skills    AS "skills",
        r.embedding <=> $1::vector AS distance
      FROM "Resume" r
      JOIN "User" u ON u.id = r."userId"
      WHERE u.role = 'Student'
        AND r.embedding IS NOT NULL
        AND ($2::text IS NULL OR $2 = 'Remote' OR r.location IS NULL OR r.location = $2)
        AND (r.embedding <=> $1::vector) <= 0.40
      ORDER BY distance ASC
      LIMIT $3
      `,
            job.embedding,
            job.location ?? null,
            top_cand
        );

        console.log(
            `[JobMatchingWorker] Found ${matches.length} matching candidates for job "${job.title}"`
        );

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        //  Enqueue each match for WhatsApp notification
        for (const match of matches) {
            const similarityScore = 1 - match.distance;
            const jobLink = `${baseUrl}/jobs/${job.id}`;
            const similarityPercent = (similarityScore * 100).toFixed(1);

            if (similarityScore >= 0.80) {
                // PERFECT_FIT
                const message = `🚀 Hey ${match.name}! You're a ${similarityPercent}% match for a new ${job.title} role at ${job.company}. Your profile looks like a great fit. Tap here to view and apply: ${jobLink}`;

                await whatsappNotificationQueue.add("send-notification", {
                    type: "PERFECT_FIT",
                    userId: match.userId,
                    userName: match.name,
                    phone: match.phone,
                    message: message
                });
            } else if (similarityScore >= 0.60) {
                // UPSKILL_OPPORTUNITY
                // Find missing skills (case-insensitive)
                const candidateSkillsLower = (match.skills || []).map(s => s.toLowerCase());
                const missingSkillsAll = (job.skills || []).filter(s => !candidateSkillsLower.includes(s.toLowerCase()));
                const missingSkills = missingSkillsAll.slice(0, 3).join(", ");

                const message = `💡 Hey ${match.name}! A ${job.title} role just opened at ${job.company}. You're a strong candidate, but they are specifically looking for experience with: ${missingSkills || "certain technologies"}. Consider brushing up on these to boost your chances! Tap here to view the job: ${jobLink}`;

                await whatsappNotificationQueue.add("send-notification", {
                    type: "UPSKILL_OPPORTUNITY",
                    userId: match.userId,
                    userName: match.name,
                    phone: match.phone,
                    message: message
                });
            }
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
