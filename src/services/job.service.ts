import prisma from "../lib/db.js";
import { generateEmbedding } from "./embedding.service.js";
import { jobMatchingQueue } from "../lib/queue.js";

interface CreateJobInput {
    title: string;
    company: string;
    description: string;
    location?: string;
    salary?: string;
    requiredExperience?: number;
    createdById: string;
}

/**
 * Creates a new Job record, generates a vector embedding for the description,
 * stores the embedding via raw SQL, and enqueues the job for matching.
 */
export async function createJobWithEmbedding(data: CreateJobInput) {
    // 1. Generate embedding from the job description
    const embedding = await generateEmbedding(data.description);

    // 2. Create job row via Prisma (embedding is Unsupported, so set separately)
    const job = await prisma.job.create({
        data: {
            title: data.title,
            company: data.company,
            description: data.description,
            location: data.location ?? null,
            salary: data.salary ?? null,
            requiredExperience: data.requiredExperience ?? 0,
            createdById: data.createdById,
        },
    });

    // 3. Store the embedding vector via raw SQL
    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
        `UPDATE "Job" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        job.id
    );

    // 4. Enqueue the job for matching
    await jobMatchingQueue.add("match-job", { jobId: job.id });

    console.log(`[JobService] Job "${job.title}" created and enqueued for matching (id: ${job.id})`);

    return job;
}
