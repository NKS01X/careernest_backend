import express from "express";
import cookieParser from "cookie-parser";
import type { Application, Request, Response } from "express";

import { register } from "../../src/controllers/register.controller.js";
import { login } from "../../src/controllers/login.controller.js";
import { logout } from "../../src/controllers/logout.controller.js";
import { isLoggedIn } from "../../src/middleware/auth.js";
import {
    getAllJobs,
    getJobById,
    getMyJobs,
    createJob,
} from "../../src/controllers/jobs.controller.js";
import { getJobMatches } from "../../src/controllers/matches.controller.js";
import { isRecruiter } from "../../src/middleware/role.js";
import { upload } from "../../src/middleware/upload.js";

export function createApp(): Application {
    const app: Application = express();
    app.use(express.json());
    app.use(cookieParser());

    app.post("/register", upload.single("resume"), register);
    app.post("/login", login);
    app.post("/logout", isLoggedIn, logout);

    app.get("/jobs", getAllJobs);
    app.get("/jobs/my", isLoggedIn, getMyJobs);
    app.get("/jobs/:id", getJobById);
    app.post("/jobs", isLoggedIn, isRecruiter, createJob);
    app.get("/jobs/:id/matches", isLoggedIn, getJobMatches);

    return app;
}
