import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock.js";
import { makeUser } from "../helpers/factories.js";

vi.mock("../../src/lib/db.js", () => ({ default: prismaMock }));

vi.mock("../../src/utils/resumeParser.js", () => ({
    parseResumeToJSON: vi.fn().mockResolvedValue({
        skills: ["TypeScript"],
        achievements: ["Test achievement"],
        projects: [{ title: "Test", description: "Test", technologies: ["JS"] }],
        workExp: [{
            company: "TestCo",
            role: "Dev",
            description: "Dev work",
            startDate: "2024-01-01",
            endDate: "2024-06-01",
        }],
    }),
}));

vi.mock("../../src/lib/queue.js", () => ({
    jobMatchingQueue: { add: vi.fn() },
    whatsappNotificationQueue: { add: vi.fn() },
    connection: {},
}));

import { createApp } from "../helpers/app.js";

const app = createApp();
const TEST_SECRET = "test-jwt-secret-for-vitest";

beforeAll(() => {
    process.env.SECRET = process.env.SECRET || TEST_SECRET;
});

describe("Auth Routes — /register", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("POST /register — should create a Recruiter user", async () => {
        prismaMock.user.findFirst.mockResolvedValueOnce(null);
        prismaMock.user.create.mockResolvedValueOnce(
            makeUser({ id: "new-recruiter-1", role: "Recruiter" })
        );

        const res = await request(app)
            .post("/register")
            .send({
                name: "New Recruiter",
                email: "recruit@test.com",
                pass: "password123",
                phone: "9100001111",
                role: "Recruiter",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.userId).toBe("new-recruiter-1");
    });

    it("POST /register — should reject duplicate email", async () => {
        prismaMock.user.findFirst.mockResolvedValueOnce(
            makeUser({ email: "dup@test.com" })
        );

        const res = await request(app)
            .post("/register")
            .send({
                name: "Dup User",
                email: "dup@test.com",
                pass: "password123",
                phone: "9100002222",
                role: "Student",
            });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it("POST /register — should reject missing fields", async () => {
        const res = await request(app)
            .post("/register")
            .send({ name: "Incomplete" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("POST /register — should reject short password", async () => {
        const res = await request(app)
            .post("/register")
            .send({
                name: "Short Pass",
                email: "short@test.com",
                pass: "123",
                phone: "9100003333",
                role: "Recruiter",
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe("Auth Routes — /login", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("POST /login — should return token cookie on success", async () => {
        const hashedPass = await bcrypt.hash("password123", 10);
        const user = makeUser({
            id: "login-user-1",
            email: "login@test.com",
            pass: hashedPass,
            role: "Recruiter",
        });

        prismaMock.user.findUnique.mockResolvedValueOnce(user);

        const res = await request(app)
            .post("/login")
            .send({ email: "login@test.com", pass: "password123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.id).toBe("login-user-1");

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();
        const tokenCookie = Array.isArray(cookies)
            ? cookies.find((c: string) => c.startsWith("token="))
            : typeof cookies === "string" && cookies.startsWith("token=")
                ? cookies
                : undefined;
        expect(tokenCookie).toBeDefined();
    });

    it("POST /login — should reject wrong password", async () => {
        const hashedPass = await bcrypt.hash("correctpassword", 10);
        prismaMock.user.findUnique.mockResolvedValueOnce(
            makeUser({ pass: hashedPass })
        );

        const res = await request(app)
            .post("/login")
            .send({ email: "test@test.com", pass: "wrongpassword" });

        expect(res.status).toBe(400);
    });

    it("POST /login — should reject nonexistent user", async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const res = await request(app)
            .post("/login")
            .send({ email: "ghost@test.com", pass: "password123" });

        expect(res.status).toBe(400);
    });

    it("POST /login — should reject missing credentials", async () => {
        const res = await request(app).post("/login").send({});

        expect(res.status).toBe(400);
    });
});

describe("Auth Routes — /logout", () => {
    beforeEach(() => {
        resetPrismaMock();
    });

    it("POST /logout — should clear token cookie", async () => {
        const user = makeUser({ id: "logout-user", role: "Student" });
        const token = jwt.sign({ id: user.id }, process.env.SECRET!);

        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
        });

        const res = await request(app)
            .post("/logout")
            .set("Cookie", `token=${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Logged out successfully");
    });

    it("POST /logout — should reject unauthenticated request", async () => {
        const res = await request(app).post("/logout");

        expect(res.status).toBe(401);
    });
});
