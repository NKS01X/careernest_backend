import dotenv from "dotenv";
import express from "express";

import { register } from "./controllers/register.controller.js";
import { login } from "./controllers/login.controller.js";
import { logout } from "./controllers/logout.controller.js";
import { isLoggedIn } from "./middleware/auth.js";

import type { Application, Request, Response } from 'express';
const app: Application = express();
const PORT = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});
app.post("/login", login);
app.post("/register", register);
app.post("/logout", isLoggedIn, logout);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
