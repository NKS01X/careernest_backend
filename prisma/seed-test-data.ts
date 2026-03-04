/**
 * seed-test-data.ts
 *
 * Seeds the database with test users (3 Students + 1 Recruiter),
 * resumes with mock 128-dim embeddings, and prints a ready-to-use
 * recruiter JWT token for Postman testing.
 *
 * Usage:  npx tsx prisma/seed-test-data.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// ─── Mock Embedding Generator ───────────────────────────────────────────────
/**
 * Generates a deterministic 128-float array that mimics Grok v1 output.
 * Values are in the range [-1, 1] with a realistic distribution using
 * seeded sin/cos variation so each student gets a different but
 * reproducible vector.
 */
function generateMockEmbedding(seed: number): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
        // Combine multiple trig functions with the seed to create
        // pseudo-random but deterministic floating-point values
        const val =
            Math.sin(seed * 13.37 + i * 0.42) *
            Math.cos(seed * 7.13 + i * 0.91) *
            0.85 +
            Math.sin(i * 0.17 + seed) * 0.15;

        // Clamp to [-1, 1] and round to 8 decimal places
        embedding.push(
            Math.round(Math.max(-1, Math.min(1, val)) * 1e8) / 1e8
        );
    }
    return embedding;
}

// ─── Student Profiles ───────────────────────────────────────────────────────
const students = [
    {
        name: "Alice Engineer",
        email: "alice@test.com",
        phone: "9100000001",
        location: "Mumbai",
        yearsOfExperience: 2,
        skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "REST APIs"],
        projects: [
            {
                title: "E-Commerce API",
                description:
                    "Built a scalable REST API with Express, Prisma, and PostgreSQL supporting 10k concurrent users.",
                technologies: ["Node.js", "Express", "Prisma", "PostgreSQL"],
            },
        ],
        workExp: [
            {
                company: "TechStartup Inc.",
                role: "Backend Developer Intern",
                description:
                    "Developed microservices for payment processing and user authentication.",
                startDate: new Date("2024-01-15"),
                endDate: new Date("2024-07-15"),
            },
        ],
        achievements: [
            "Winner — Smart India Hackathon 2024",
            "Published npm package with 500+ weekly downloads",
        ],
        embeddingSeed: 1,
    },
    {
        name: "Bob Developer",
        email: "bob@test.com",
        phone: "9100000002",
        location: "Bangalore",
        yearsOfExperience: 1,
        skills: ["Python", "FastAPI", "React", "MongoDB", "AWS"],
        projects: [
            {
                title: "ML Pipeline Dashboard",
                description:
                    "Full-stack dashboard for monitoring ML model training pipelines with real-time metrics.",
                technologies: ["React", "FastAPI", "MongoDB", "WebSocket"],
            },
        ],
        workExp: [
            {
                company: "DataCorp Analytics",
                role: "Full Stack Intern",
                description:
                    "Built data visualization dashboards and automated ETL pipelines.",
                startDate: new Date("2024-06-01"),
                endDate: new Date("2024-12-01"),
            },
        ],
        achievements: [
            "3-star on CodeChef",
            "Top 10% in Kaggle competition",
        ],
        embeddingSeed: 2,
    },
    {
        name: "Carol Designer",
        email: "carol@test.com",
        phone: "9100000003",
        location: "Mumbai",
        yearsOfExperience: 3,
        skills: ["Figma", "TypeScript", "Next.js", "TailwindCSS", "GraphQL"],
        projects: [
            {
                title: "Design System Library",
                description:
                    "Built a reusable component library with Storybook, achieving 95% design consistency across 3 products.",
                technologies: [
                    "React",
                    "TypeScript",
                    "Storybook",
                    "TailwindCSS",
                ],
            },
        ],
        workExp: [
            {
                company: "DesignHub Studio",
                role: "UI/UX Engineer",
                description:
                    "Designed and implemented responsive web interfaces for SaaS products.",
                startDate: new Date("2023-03-01"),
                endDate: new Date("2025-02-28"),
            },
        ],
        achievements: [
            "Awwwards Honorable Mention 2024",
            "Published UX case study with 10k+ reads on Medium",
        ],
        embeddingSeed: 3,
    },
];

// ─── Recruiter Profile ──────────────────────────────────────────────────────
const recruiter = {
    name: "Dave Recruiter",
    email: "dave@test.com",
    phone: "9100000004",
};

const SEED_PASSWORD = "password123";

// ─── Main Seed Function ─────────────────────────────────────────────────────
async function main() {
    console.log("🌱 Starting seed...\n");

    // ── Clean up previous seed data (by email) ──
    const seedEmails = [
        ...students.map((s) => s.email),
        recruiter.email,
    ];

    // Delete in dependency order: Application → WorkExperience → Project → Resume → Job → User
    for (const email of seedEmails) {
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            // Delete applications
            await prisma.application.deleteMany({
                where: { userId: existingUser.id },
            });
            // Delete jobs created by this user
            const jobs = await prisma.job.findMany({
                where: { createdById: existingUser.id },
                select: { id: true },
            });
            for (const job of jobs) {
                await prisma.application.deleteMany({
                    where: { jobId: job.id },
                });
            }
            await prisma.job.deleteMany({
                where: { createdById: existingUser.id },
            });
            // Delete resume + nested
            const resume = await prisma.resume.findUnique({
                where: { userId: existingUser.id },
                select: { id: true },
            });
            if (resume) {
                await prisma.project.deleteMany({
                    where: { resumeId: resume.id },
                });
                await prisma.workExperience.deleteMany({
                    where: { resumeId: resume.id },
                });
                await prisma.resume.delete({
                    where: { id: resume.id },
                });
            }
            await prisma.user.delete({ where: { id: existingUser.id } });
        }
    }

    console.log("🧹 Cleaned up previous seed data\n");

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    // ── Create Recruiter ──
    const recruiterUser = await prisma.user.create({
        data: {
            name: recruiter.name,
            email: recruiter.email,
            phone: recruiter.phone,
            pass: hashedPassword,
            role: "Recruiter",
        },
    });
    console.log(
        `✅ Recruiter: ${recruiterUser.name} (id: ${recruiterUser.id})`
    );

    // ── Create Students with Resumes ──
    const createdStudents: { userId: string; embedding: number[] }[] = [];

    for (const student of students) {
        const user = await prisma.user.create({
            data: {
                name: student.name,
                email: student.email,
                phone: student.phone,
                pass: hashedPassword,
                role: "Student",
                resume: {
                    create: {
                        skills: student.skills,
                        achievements: student.achievements,
                        location: student.location ?? null,
                        yearsOfExperience: student.yearsOfExperience ?? 0,
                        projects: {
                            create: student.projects.map((p) => ({
                                title: p.title,
                                description: p.description,
                                technologies: p.technologies,
                            })),
                        },
                        workExp: {
                            create: student.workExp.map((w) => ({
                                company: w.company,
                                role: w.role,
                                description: w.description,
                                startDate: w.startDate,
                                endDate: w.endDate ?? null,
                            })),
                        },
                    },
                },
            },
            include: {
                resume: true,
            },
        });

        const embedding = generateMockEmbedding(student.embeddingSeed);
        createdStudents.push({ userId: user.id, embedding });

        console.log(
            `✅ Student: ${user.name} (id: ${user.id}, resume: ${user.resume?.id})`
        );
    }

    // ── Insert Embeddings via Raw SQL ──
    console.log("\n📐 Inserting resume embeddings via raw SQL...");

    for (const { userId, embedding } of createdStudents) {
        const vectorString = `[${embedding.join(",")}]`;
        await prisma.$executeRawUnsafe(
            `UPDATE "Resume" SET embedding = $1::vector WHERE "userId" = $2`,
            vectorString,
            userId
        );
        console.log(`   ✓ Embedding set for userId: ${userId}`);
    }

    // ── Generate JWT token for Postman ──
    const secret = process.env.JWT_SECRET || process.env.SECRET || "FUCKU";
    const token = jwt.sign(
        {
            id: recruiterUser.id,
            email: recruiterUser.email,
            username: recruiterUser.name,
        },
        secret,
        { expiresIn: "7d" }
    );

    console.log("\n" + "═".repeat(60));
    console.log("🎉 SEED COMPLETE");
    console.log("═".repeat(60));
    console.log(`\n📋 Recruiter ID:  ${recruiterUser.id}`);
    console.log(`📋 Recruiter JWT: ${token}`);
    console.log(`\n💡 Use this JWT as a cookie in Postman:`);
    console.log(`   Cookie: token=${token}`);
    console.log(
        `\n💡 Or set it in Postman → Headers → Cookie: token=<paste above>`
    );
    console.log("═".repeat(60));
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
