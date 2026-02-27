import type { Request, Response } from "express";
import { encrypt } from "../utils/utils.js";
import User from "../models/User.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPass = await encrypt(password);

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPass,
    });

    return res.status(201).json({
      success: true,
      message: "User registered",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};