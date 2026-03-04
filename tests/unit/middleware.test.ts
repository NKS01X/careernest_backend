import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock.js";
import { makeUser } from "../helpers/factories.js";

vi.mock("../../src/lib/db.js", () => ({ default: prismaMock }));

import { isLoggedIn } from "../../src/middleware/auth.js";
import { isRecruiter, isStudent } from "../../src/middleware/role.js";

const TEST_SECRET = "test-jwt-secret-for-vitest";

beforeAll(() => {
    process.env.SECRET = process.env.SECRET || TEST_SECRET;
});

function mockReq(overrides: Record<string, any> = {}): Request & { user?: any } {
    return {
        cookies: {},
        ...overrides,
    } as any;
}

function mockRes(): Response {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

function mockNext(): NextFunction {
    return vi.fn();
}

describe("Middleware — isLoggedIn", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("should reject request with no cookie", async () => {
        const req = mockReq({ cookies: {} });
        const res = mockRes();
        const next = mockNext();

        await isLoggedIn(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should reject request with invalid JWT", async () => {
        const req = mockReq({ cookies: { token: "invalid.token.here" } });
        const res = mockRes();
        const next = mockNext();

        await isLoggedIn(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("should reject if user not found in DB", async () => {
        const token = jwt.sign({ id: "nonexistent-user" }, process.env.SECRET!);
        const req = mockReq({ cookies: { token } });
        const res = mockRes();
        const next = mockNext();

        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        await isLoggedIn(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("should attach user to req and call next() for valid token", async () => {
        const user = makeUser({ id: "user-valid", role: "Recruiter" });
        const token = jwt.sign({ id: user.id }, process.env.SECRET!);
        const req = mockReq({ cookies: { token } });
        const res = mockRes();
        const next = mockNext();

        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
        });

        await isLoggedIn(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(user.id);
        expect(req.user.role).toBe("Recruiter");
    });
});

describe("Middleware — isRecruiter", () => {
    it("should call next() for Recruiter role", () => {
        const req = mockReq({ user: { role: "Recruiter" } });
        const res = mockRes();
        const next = mockNext();

        isRecruiter(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("should return 403 for Student role", () => {
        const req = mockReq({ user: { role: "Student" } });
        const res = mockRes();
        const next = mockNext();

        isRecruiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 when no user on request", () => {
        const req = mockReq({});
        const res = mockRes();
        const next = mockNext();

        isRecruiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("Middleware — isStudent", () => {
    it("should call next() for Student role", () => {
        const req = mockReq({ user: { role: "Student" } });
        const res = mockRes();
        const next = mockNext();

        isStudent(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("should return 403 for Recruiter role", () => {
        const req = mockReq({ user: { role: "Recruiter" } });
        const res = mockRes();
        const next = mockNext();

        isStudent(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
