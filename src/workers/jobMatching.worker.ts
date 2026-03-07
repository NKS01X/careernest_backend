import { Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";
import { connection } from "../lib/queue.js";
import { emailNotificationQueue } from "../lib/queue.js";
import prisma from "../lib/db.js";

const top_cand = 10;

interface JobMatchingPayload {
    jobId: string;
}

interface MatchedCandidate {
    resumeId: string;
    userId: string;
    name: string;
    email: string;
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

const jobMatchingWorker = new Worker<JobMatchingPayload>(
    "job-matching-queue",
    async (bullJob: BullJob<JobMatchingPayload>) => {
        const { jobId } = bullJob.data;
        console.log(`[JobMatchingWorker] Processing job: ${jobId}`);

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

        const matches = await prisma.$queryRawUnsafe<MatchedCandidate[]>(
            `
      SELECT
        r.id        AS "resumeId",
        r."userId"  AS "userId",
        u.name      AS "name",
        u.email     AS "email",
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

        for (const match of matches) {
            const similarityScore = 1 - match.distance;
            const jobLink = `${baseUrl}/jobs/${job.id}`;
            const similarityPercent = (similarityScore * 100).toFixed(1);

            if (similarityScore >= 0.80) {
                const subject = `Job Match: ${job.title} at ${job.company}`;
                const text = `🚀 Hey ${match.name}! You're a ${similarityPercent}% match for a new ${job.title} role at ${job.company}. Your profile looks like a great fit. Tap here to view and apply: ${jobLink}`;
                const html = `<p>🚀 Hey <strong>${match.name}</strong>!</p><p>You're a <strong>${similarityPercent}% match</strong> for a new <strong>${job.title}</strong> role at <strong>${job.company}</strong>. Your profile looks like a great fit.</p><p><a href="${jobLink}">Tap here to view and apply</a></p>`;

                await emailNotificationQueue.add("send-notification", {
                    email: match.email,
                    subject,
                    text,
                    html
                });
            } else if (similarityScore >= 0.60) {
                const candidateSkillsLower = (match.skills || []).map(s => s.toLowerCase());
                const missingSkillsAll = (job.skills || []).filter(s => !candidateSkillsLower.includes(s.toLowerCase()));
                const missingSkills = missingSkillsAll.slice(0, 3).join(", ");

                const subject = `Upskill Opportunity: ${job.title} at ${job.company}`;
                const text = `💡 Hey ${match.name}! A ${job.title} role just opened at ${job.company}. You're a strong candidate, but they are specifically looking for experience with: ${missingSkills || "certain technologies"}. Consider brushing up on these to boost your chances! Tap here to view the job: ${jobLink}`;
                const html = `<p>💡 Hey <strong>${match.name}</strong>!</p><p>A <strong>${job.title}</strong> role just opened at <strong>${job.company}</strong>. You're a strong candidate, but they are specifically looking for experience with: <strong>${missingSkills || "certain technologies"}</strong>. Consider brushing up on these to boost your chances!</p><p><a href="${jobLink}">Tap here to view the job</a></p>`;

                await emailNotificationQueue.add("send-notification", {
                    email: match.email,
                    subject,
                    text,
                    html
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
