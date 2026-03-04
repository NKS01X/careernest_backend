import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock.js";
import { makeJob, makeUser } from "../helpers/factories.js";

const { mockGenerateEmbedding, mockQueueAdd } = vi.hoisted(() => {
    return {
        mockGenerateEmbedding: vi.fn(),
        mockQueueAdd: vi.fn(),
    };
});

vi.mock("../../src/lib/db.js", () => ({ default: prismaMock }));

vi.mock("../../src/services/embedding.service.js", () => ({
    generateEmbedding: mockGenerateEmbedding,
}));

vi.mock("../../src/lib/queue.js", () => ({
    jobMatchingQueue: { add: mockQueueAdd },
    whatsappNotificationQueue: { add: vi.fn() },
    connection: {},
}));

vi.mock("../../src/utils/resumeParser.js", () => ({
    parseResumeToJSON: vi.fn(),
}));

import { createApp } from "../helpers/app.js";

const app = createApp();
const TEST_SECRET = "test-jwt-secret-for-vitest";

beforeAll(() => {
    process.env.SECRET = process.env.SECRET || TEST_SECRET;
});

function recruiterToken(userId = "recruiter-1") {
    return jwt.sign({ id: userId }, process.env.SECRET!);
}

function studentToken(userId = "student-1") {
    return jwt.sign({ id: userId }, process.env.SECRET!);
}

function mockAuthUser(user: ReturnType<typeof makeUser>) {
    prismaMock.user.findUnique.mockResolvedValueOnce({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
    });
}

describe("Job Routes — GET /jobs", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("should return all jobs", async () => {
        const jobs = [
            makeJob({ id: "job-1", title: "Backend Engineer" }),
            makeJob({ id: "job-2", title: "Frontend Developer" }),
        ];
        prismaMock.job.findMany.mockResolvedValueOnce(jobs);

        const res = await request(app).get("/jobs");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.jobs).toHaveLength(2);
        expect(res.body.jobs[0].title).toBe("Backend Engineer");
    });

    it("should return empty array when no jobs exist", async () => {
        prismaMock.job.findMany.mockResolvedValueOnce([]);

        const res = await request(app).get("/jobs");

        expect(res.status).toBe(200);
        expect(res.body.jobs).toHaveLength(0);
    });
});

describe("Job Routes — GET /jobs/:id", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("should return a single job", async () => {
        const job = makeJob({ id: "job-single" });
        prismaMock.job.findUnique.mockResolvedValueOnce(job);

        const res = await request(app).get("/jobs/job-single");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.job.id).toBe("job-single");
    });

    it("should return 404 for missing job", async () => {
        prismaMock.job.findUnique.mockResolvedValueOnce(null);

        const res = await request(app).get("/jobs/nonexistent");

        expect(res.status).toBe(404);
    });
});

describe("Job Routes — POST /jobs", () => {
    const mockEmbedding = Array.from({ length: 128 }, () => 0.5);

    beforeEach(() => {
        resetPrismaMock();
        mockGenerateEmbedding.mockReset();
        mockQueueAdd.mockReset();
    });

    it("should create a job as Recruiter", async () => {
        const recruiter = makeUser({ id: "recruiter-1", role: "Recruiter" });
        mockAuthUser(recruiter);

        const createdJob = makeJob({ id: "new-job-1", createdById: recruiter.id });
        mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);
        prismaMock.job.create.mockResolvedValueOnce(createdJob);
        prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1);
        mockQueueAdd.mockResolvedValueOnce({});

        const res = await request(app)
            .post("/jobs")
            .set("Cookie", `token=${recruiterToken()}`)
            .send({
                title: "Backend Engineer",
                company: "TechCorp",
                description: "Build scalable APIs with Node.js",
                location: "Mumbai",
                salary: "12-18 LPA",
                requiredExperience: 2,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.job.id).toBe("new-job-1");
    });

    it("should block Students from creating jobs (403)", async () => {
        const student = makeUser({ id: "student-1", role: "Student" });
        mockAuthUser(student);

        const res = await request(app)
            .post("/jobs")
            .set("Cookie", `token=${studentToken()}`)
            .send({
                title: "Test Job",
                company: "Test",
                description: "Test",
            });

        expect(res.status).toBe(403);
    });

    it("should reject unauthenticated requests (401)", async () => {
        const res = await request(app)
            .post("/jobs")
            .send({ title: "Test" });

        expect(res.status).toBe(401);
    });

    it("should enqueue BullMQ job after creation", async () => {
        const recruiter = makeUser({ id: "recruiter-2", role: "Recruiter" });
        mockAuthUser(recruiter);

        const createdJob = makeJob({ id: "enqueued-job" });
        mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);
        prismaMock.job.create.mockResolvedValueOnce(createdJob);
        prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1);
        mockQueueAdd.mockResolvedValueOnce({});

        await request(app)
            .post("/jobs")
            .set("Cookie", `token=${recruiterToken("recruiter-2")}`)
            .send({
                title: "Test Queue Job",
                company: "QueueCorp",
                description: "Testing BullMQ enqueue",
            });

        expect(mockQueueAdd).toHaveBeenCalledWith("match-job", {
            jobId: "enqueued-job",
        });
    });
});

describe("Job Routes — GET /jobs/:id/matches", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("should return top 5 matches with similarity scores", async () => {
        const recruiter = makeUser({ id: "recruiter-m1", role: "Recruiter" });
        mockAuthUser(recruiter);

        prismaMock.$queryRawUnsafe.mockResolvedValueOnce([
            {
                id: "matched-job",
                title: "Backend Engineer",
                company: "TechCorp",
                embedding: "[0.1,0.2,0.3]",
            },
        ]);

        prismaMock.$queryRawUnsafe.mockResolvedValueOnce([
            { resumeId: "r1", userId: "u1", name: "Alice", email: "alice@test.com", similarity: 0.95 },
            { resumeId: "r2", userId: "u2", name: "Bob", email: "bob@test.com", similarity: 0.87 },
            { resumeId: "r3", userId: "u3", name: "Carol", email: "carol@test.com", similarity: 0.82 },
        ]);

        const res = await request(app)
            .get("/jobs/matched-job/matches")
            .set("Cookie", `token=${recruiterToken("recruiter-m1")}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.jobTitle).toBe("Backend Engineer");
        expect(res.body.totalMatches).toBe(3);
        expect(res.body.matches[0].name).toBe("Alice");
        expect(res.body.matches[0].similarity).toBe(0.95);
    });

    it("should return 404 for nonexistent job", async () => {
        const recruiter = makeUser({ id: "recruiter-m2", role: "Recruiter" });
        mockAuthUser(recruiter);

        prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

        const res = await request(app)
            .get("/jobs/nonexistent/matches")
            .set("Cookie", `token=${recruiterToken("recruiter-m2")}`);

        expect(res.status).toBe(404);
    });

    it("should return 400 if job has no embedding", async () => {
        const recruiter = makeUser({ id: "recruiter-m3", role: "Recruiter" });
        mockAuthUser(recruiter);

        prismaMock.$queryRawUnsafe.mockResolvedValueOnce([
            {
                id: "no-embed-job",
                title: "No Embed",
                company: "Corp",
                embedding: null,
            },
        ]);

        const res = await request(app)
            .get("/jobs/no-embed-job/matches")
            .set("Cookie", `token=${recruiterToken("recruiter-m3")}`);

        expect(res.status).toBe(400);
    });

    it("should reject unauthenticated requests (401)", async () => {
        const res = await request(app).get("/jobs/some-job/matches");

        expect(res.status).toBe(401);
    });
});
