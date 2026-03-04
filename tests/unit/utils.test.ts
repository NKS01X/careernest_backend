import { describe, it, expect } from "vitest";
import { encrypt, verifyPass } from "../../src/utils/utils.js";

describe("Utils — encrypt & verifyPass", () => {
    const plainPassword = "securePassword123";

    it("encrypt() should return a bcrypt hash string", async () => {
        const hash = await encrypt(plainPassword);

        expect(typeof hash).toBe("string");
        expect(hash).toMatch(/^\$2[ab]\$/);
        expect(hash.length).toBeGreaterThanOrEqual(59);
    });

    it("encrypt() should produce different hashes for same input (random salt)", async () => {
        const hash1 = await encrypt(plainPassword);
        const hash2 = await encrypt(plainPassword);

        expect(hash1).not.toBe(hash2);
    });

    it("verifyPass() should return true for correct password", async () => {
        const hash = await encrypt(plainPassword);
        const result = await verifyPass(plainPassword, hash);

        expect(result).toBe(true);
    });

    it("verifyPass() should return false for wrong password", async () => {
        const hash = await encrypt(plainPassword);
        const result = await verifyPass("wrongPassword", hash);

        expect(result).toBe(false);
    });

    it("verifyPass() should return false for empty password", async () => {
        const hash = await encrypt(plainPassword);
        const result = await verifyPass("", hash);

        expect(result).toBe(false);
    });
});
