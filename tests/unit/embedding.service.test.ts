import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => {
    return { mockCreate: vi.fn() };
});

vi.mock("openai", () => {
    return {
        default: class MockOpenAI {
            embeddings = { create: mockCreate };
            constructor() { }
        },
    };
});

import { generateEmbedding } from "../../src/services/embedding.service.js";

describe("EmbeddingService — generateEmbedding", () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });

    it("should return a 128-float array on success", async () => {
        const mockEmbedding = Array.from({ length: 128 }, (_, i) =>
            Math.sin(i * 0.1)
        );

        mockCreate.mockResolvedValueOnce({
            data: [{ embedding: mockEmbedding }],
        });

        const result = await generateEmbedding("Test description for a job");

        expect(result).toEqual(mockEmbedding);
        expect(result).toHaveLength(128);
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("should strip newlines from input text", async () => {
        const mockEmbedding = Array.from({ length: 128 }, () => 0.5);

        mockCreate.mockResolvedValueOnce({
            data: [{ embedding: mockEmbedding }],
        });

        await generateEmbedding("Line one\nLine two\nLine three");

        const callArgs = mockCreate.mock.calls[0]![0] as any;
        expect(callArgs.input).toBe("Line one Line two Line three");
    });

    it("should call the Grok API with model 'v1'", async () => {
        const mockEmbedding = Array.from({ length: 128 }, () => 0.1);

        mockCreate.mockResolvedValueOnce({
            data: [{ embedding: mockEmbedding }],
        });

        await generateEmbedding("test");

        const callArgs = mockCreate.mock.calls[0]![0] as any;
        expect(callArgs.model).toBe("v1");
    });

    it("should throw when API returns empty data", async () => {
        mockCreate.mockResolvedValueOnce({
            data: [],
        });

        await expect(generateEmbedding("test")).rejects.toThrow(
            "Failed to generate embedding from Grok API"
        );
    });

    it("should throw when API returns no embedding field", async () => {
        mockCreate.mockResolvedValueOnce({
            data: [{ embedding: undefined }],
        });

        await expect(generateEmbedding("test")).rejects.toThrow(
            "Failed to generate embedding from Grok API"
        );
    });

    it("should propagate API errors", async () => {
        mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

        await expect(generateEmbedding("test")).rejects.toThrow(
            "API rate limit exceeded"
        );
    });
});
