import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock.js";
import { makeJob } from "../helpers/factories.js";

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
}));

import { createJobWithEmbedding } from "../../src/services/job.service.js";

describe("JobService — createJobWithEmbedding", () => {
    const mockEmbedding = Array.from({ length: 128 }, (_, i) =>
        Math.sin(i * 0.1)
    );

    beforeEach(() => {
        resetPrismaMock();
        mockGenerateEmbedding.mockReset();
        mockQueueAdd.mockReset();
    });

    it("should create a job, store embedding, and enqueue for matching", async () => {
        const createdJob = makeJob({ id: "job-123" });
        mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);
        prismaMock.job.create.mockResolvedValueOnce(createdJob);
        prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1);
        mockQueueAdd.mockResolvedValueOnce({});

        const result = await createJobWithEmbedding({
            title: "Backend Engineer",
            company: "TechCorp",
            description: "Build scalable APIs",
            location: "Mumbai",
            salary: "12-18 LPA",
            requiredExperience: 2,
            createdById: "user-1",
        });

        expect(mockGenerateEmbedding).toHaveBeenCalledWith("Build scalable APIs");

        expect(prismaMock.job.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: "Backend Engineer",
                company: "TechCorp",
                description: "Build scalable APIs",
                location: "Mumbai",
                salary: "12-18 LPA",
                requiredExperience: 2,
                createdById: "user-1",
            }),
        });

        expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith(
            `UPDATE "Job" SET embedding = $1::vector WHERE id = $2`,
            expect.stringContaining("["),
            "job-123"
        );

        expect(mockQueueAdd).toHaveBeenCalledWith("match-job", {
            jobId: "job-123",
        });

        expect(result).toEqual(createdJob);
    });

    it("should use ?? null for optional fields (no undefined to Prisma)", async () => {
        const createdJob = makeJob({ id: "job-456" });
        mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);
        prismaMock.job.create.mockResolvedValueOnce(createdJob);
        prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1);
        mockQueueAdd.mockResolvedValueOnce({});

        await createJobWithEmbedding({
            title: "Frontend Dev",
            company: "DesignCo",
            description: "React + TypeScript",
            createdById: "user-2",
        });

        const createCall = prismaMock.job.create.mock.calls[0]![0] as any;

        expect(createCall.data.location).toBeNull();
        expect(createCall.data.salary).toBeNull();
        expect(createCall.data.requiredExperience).toBe(0);
    });

    it("should format embedding as [x,y,z] string for SQL", async () => {
        const simpleEmbedding = [0.1, -0.2, 0.3];
        mockGenerateEmbedding.mockResolvedValueOnce(simpleEmbedding);
        prismaMock.job.create.mockResolvedValueOnce(makeJob({ id: "job-789" }));
        prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1);
        mockQueueAdd.mockResolvedValueOnce({});

        await createJobWithEmbedding({
            title: "Test",
            company: "Test",
            description: "Test",
            createdById: "user-3",
        });

        const sqlArgs = prismaMock.$executeRawUnsafe.mock.calls[0]!;
        expect(sqlArgs[1]).toBe("[0.1,-0.2,0.3]");
    });

    it("should propagate embedding generation errors", async () => {
        mockGenerateEmbedding.mockRejectedValueOnce(
            new Error("Grok API down")
        );

        await expect(
            createJobWithEmbedding({
                title: "Test",
                company: "Test",
                description: "Test",
                createdById: "user-4",
            })
        ).rejects.toThrow("Grok API down");
    });
});
