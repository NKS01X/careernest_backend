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

export async function createJobWithEmbedding(data: CreateJobInput) {
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
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed)) {
                extractedSkills = parsed;
            } else if (parsed.skills && Array.isArray(parsed.skills)) {
                extractedSkills = parsed.skills;
            } else {
                extractedSkills = Object.values(parsed).find(Array.isArray) || [];
            }
        }
    } catch (err) {
        console.error("[JobService] Skill extraction failed:", err);
    }

    const embedding = await generateEmbedding(data.description);

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

    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
        `UPDATE "Job" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        job.id
    );

    await jobMatchingQueue.add("match-job", { jobId: job.id });

    console.log(`[JobService] Job "${job.title}" created and enqueued for matching (id: ${job.id})`);

    return job;
}
