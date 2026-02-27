import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/register.schema.js";
import dotenv from "dotenv";

dotenv.config();

export const isLoggedIn = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!process.env.SECRET) {
      throw new Error("SECRET not defined");
    }

    const decoded = jwt.verify(
      token,
      process.env.SECRET
    ) as { id: string };

    const user = await User.findById(decoded.id).select("-pass");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();

  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};