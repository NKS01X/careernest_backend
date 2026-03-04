import type { Request, Response } from "express";
import prisma from "../lib/db.js";

interface MatchResult {
    resumeId: string;
    userId: string;
    name: string;
    email: string;
    similarity: number;
}

interface JobEmbeddingRow {
    id: string;
    title: string;
    company: string;
    embedding: string;
}

/**
 * GET /jobs/:id/matches
 *
 * Manually triggers a cosine similarity search to find the top 5
 * student resumes that best match a given job's embedding.
 *
 * Uses:  1 - (resume.embedding <=> job.embedding) AS similarity
 */
export const getJobMatches = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const jobId = req.params["id"] as string;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: "Job ID is required",
            });
        }

        // 1. Fetch the job and its embedding via raw SQL
        //    (embedding is Unsupported in Prisma, so we cast to text)
        const jobRows = await prisma.$queryRawUnsafe<JobEmbeddingRow[]>(
            `SELECT id, title, company, embedding::text
             FROM "Job"
             WHERE id = $1`,
            jobId
        );

        const job = jobRows[0];

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        if (!job.embedding) {
            return res.status(400).json({
                success: false,
                message:
                    "Job has no embedding yet. The embedding may still be processing.",
            });
        }

        // 2. Run cosine similarity search against Resume embeddings
        //    1 - (<=>)  gives similarity score where 1 = identical, 0 = orthogonal
        const matches = await prisma.$queryRawUnsafe<MatchResult[]>(
            `
            SELECT
                r.id          AS "resumeId",
                r."userId"    AS "userId",
                u.name        AS "name",
                u.email       AS "email",
                1 - (r.embedding <=> $1::vector) AS similarity
            FROM "Resume" r
            JOIN "User" u ON u.id = r."userId"
            WHERE u.role = 'Student'
              AND r.embedding IS NOT NULL
            ORDER BY similarity DESC
            LIMIT 5
            `,
            job.embedding
        );

        // 3. Format similarity as percentage-style floats
        const formattedMatches = matches.map((m) => ({
            resumeId: m.resumeId,
            userId: m.userId,
            name: m.name,
            email: m.email,
            similarity: Number(Number(m.similarity).toFixed(4)),
        }));

        return res.status(200).json({
            success: true,
            jobId: job.id,
            jobTitle: job.title,
            jobCompany: job.company,
            totalMatches: formattedMatches.length,
            matches: formattedMatches,
        });
    } catch (error) {
        console.error("[getJobMatches] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching job matches",
        });
    }
};
