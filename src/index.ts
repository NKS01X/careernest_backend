import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";

import { register } from "./controllers/register.controller.js";
import { login } from "./controllers/login.controller.js";
import { logout } from "./controllers/logout.controller.js";
import { isLoggedIn } from "./middleware/auth.js";
import { getAllJobs, getJobById, getMyJobs, createJob } from "./controllers/jobs.controller.js"
import { getJobMatches } from "./controllers/matches.controller.js";
import { isRecruiter, isStudent } from "./middleware/role.js";
import type { Application, Request, Response } from 'express';
import { upload } from "./middleware/upload.js";
import cors from "cors";

dotenv.config();

const app: Application = express();
app.use(cors({
  origin: true, // Allow all origins and reflect the incoming origin
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('WELCOME TO Careernest!');
});
// Auth Routes
app.post("/login", login);
app.post("/register", upload.single("resume"), register);
app.post("/logout", isLoggedIn, logout);

// Job Routes
/*

GET /jobs        → all jobs (for students)
GET /jobs/:id    → specific job

GET /jobs/my     → jobs creates by the current user or maybe ?createdBy=me
*/
// Job Routes
app.get("/jobs", getAllJobs);
app.get("/jobs/my", isLoggedIn, getMyJobs);              // ✅ specific first
app.get("/jobs/:id/matches", isLoggedIn, getJobMatches); // ✅ more specific before :id
app.get("/jobs/:id", getJobById);                        // ✅ generic last
app.post("/jobs", isLoggedIn, isRecruiter, createJob);
import { getMyAnalytics } from "./controllers/analytics.controller.js";

// app.get("/jobs/:id/applications", isLoggedIn, getJobApplications);

// Analytics Route
app.get("/analytics/me", isLoggedIn, getMyAnalytics);
/*

/jobs/:id/apply -> form request in future most probably only for the jobs created by the recruiters

    should be protected for only students
 
*/
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
