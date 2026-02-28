import dotenv from "dotenv";
import express from "express";

import { register } from "./controllers/register.controller.js";
import { login } from "./controllers/login.controller.js";
import { logout } from "./controllers/logout.controller.js";
import { isLoggedIn } from "./middleware/auth.js";

import type { Application, Request, Response } from 'express';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT||3000;
/*

GET /jobs        → all jobs (for students)
GET /jobs/:id    → specific job

GET /jobs/my     → jobs creates by the current user or maybe ?createdBy=me
*/
app.get('/', (req: Request, res: Response) => {
  res.send('WELCOME TO INTERNSHILA!');
});
app.post("/login", login);
app.post("/register", register);
app.post("/logout", isLoggedIn, logout);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
