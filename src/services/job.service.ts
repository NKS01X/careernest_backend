import prisma from "../lib/db.js";
import { generateEmbedding } from "./embedding.service.js";
import { jobMatchingQueue } from "../lib/queue.js";
import OpenAI from "openai";

const grok = new OpenAI({
    apiKey: process.env.GROQ_API || "",
    baseURL: "https://api.groq.com/openai/v1",
});

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
    // 1. Extract skills from job description using Groq
    let extractedSkills: string[] = [];
    try {
        const systemPrompt = "You are an expert technical recruiter. Extract the 10-15 most critical technical skills, languages, and tools from the provided job description. Normalize names (e.g., 'React' instead of 'React.js'). Return ONLY a valid JSON array of strings. Do not include markdown formatting or conversational text. Job Description: " + data.description;

        const response = await grok.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const responseText = response.choices[0]?.message?.content;
        if (responseText) {
            // Grok might return `{ "skills": [...] }` or just `[...]` depending on the instruction, 
            // but the prompt asked for "ONLY a valid JSON array of strings". 
            // In JSON mode, it forces an object typically, but let's parse safely.
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed)) {
                extractedSkills = parsed;
            } else if (parsed.skills && Array.isArray(parsed.skills)) {
                extractedSkills = parsed.skills;
            } else {
                // fallback if it returns an object with other keys
                extractedSkills = Object.values(parsed).find(Array.isArray) || [];
            }
        }
    } catch (err) {
        console.error("[JobService] Skill extraction failed:", err);
    }

    // 2. Generate embedding from the job description
    const embedding = await generateEmbedding(data.description);

    // 3. Create job row via Prisma (embedding is Unsupported, so set separately)
    const job = await prisma.job.create({
        data: {
            title: data.title,
            company: data.company,
            description: data.description,
            location: data.location ?? null,
            salary: data.salary ?? null,
            requiredExperience: data.requiredExperience ?? 0,
            skills: extractedSkills,
            createdById: data.createdById,
        },
    });

    // 4. Store the embedding vector via raw SQL
    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
        `UPDATE "Job" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        job.id
    );

    // 5. Enqueue the job for matching
    await jobMatchingQueue.add("match-job", { jobId: job.id });

    console.log(`[JobService] Job "${job.title}" created and enqueued for matching (id: ${job.id})`);

    return job;
}
