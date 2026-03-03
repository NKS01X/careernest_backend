import dotenv from "dotenv";
import express from "express";

import { register } from "./controllers/register.controller.js";
import { login } from "./controllers/login.controller.js";
import { logout } from "./controllers/logout.controller.js";
import { isLoggedIn } from "./middleware/auth.js";
import { getAllJobs, getJobById, getMyJobs, createJob } from "./controllers/jobs.controller.js"
import { isRecruiter, isStudent } from "./middleware/role.js";
import type { Application, Request, Response } from 'express';

dotenv.config();

const app: Application = express();
app.use(express.json());
const PORT = process.env.PORT||3000;

app.get('/', (req: Request, res: Response) => {
  res.send('WELCOME TO Careernest!');
});
// Auth Routes
app.post("/login", login);
app.post("/register", register);
app.post("/logout", isLoggedIn, logout);

// Job Routes
/*

GET /jobs        → all jobs (for students)
GET /jobs/:id    → specific job

GET /jobs/my     → jobs creates by the current user or maybe ?createdBy=me
*/
app.get("/jobs", getAllJobs);
app.get("/jobs/my", isLoggedIn, getMyJobs); // Protected: needs user ID from token
app.get("/jobs/:id", getJobById);
app.post("/jobs", isLoggedIn, isRecruiter, createJob); // Protected: only recruiters

/*

/jobs/:id/apply -> form request in future most probably only for the jobs created by the recruiters

    should be protected for only students
 
*/
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
