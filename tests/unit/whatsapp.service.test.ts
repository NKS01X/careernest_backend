import { describe, it, expect } from "vitest";
import { sendWhatsAppMessage } from "../../src/services/whatsapp.service.js";

describe("WhatsAppService — sendWhatsAppMessage", () => {
    it("should return success with a messageId", async () => {
        const result = await sendWhatsAppMessage(
            "9199999999",
            "Test notification"
        );

        expect(result.success).toBe(true);
        expect(typeof result.messageId).toBe("string");
        expect(result.messageId.length).toBeGreaterThan(0);
    });

    it("should prefix messageId with 'mock_'", async () => {
        const result = await sendWhatsAppMessage("9199999999", "Hello");

        expect(result.messageId).toMatch(/^mock_/);
    });

    it("should include a timestamp in messageId", async () => {
        const before = Date.now();
        const result = await sendWhatsAppMessage("9199999999", "Test");
        const after = Date.now();

        const parts = result.messageId.split("_");
        const timestamp = Number(parts[1]);

        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("should handle any phone format", async () => {
        const result = await sendWhatsAppMessage("+91-9000000000", "Test");
        expect(result.success).toBe(true);
    });

    it("should handle long messages", async () => {
        const longMessage = "A".repeat(5000);
        const result = await sendWhatsAppMessage("9199999999", longMessage);
        expect(result.success).toBe(true);
    });
});
