import type { Request, Response } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { User } from "../models/register.schema.js";
import { verifyPass } from "../utils/utils.js";
import dotenv from "dotenv";

dotenv.config();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, pass } = req.body;

    if (!email || !pass) {
      return res.status(400).json({
        success: false,
        message: "Insufficient Credentials",
      });
    }

    const user;//fetch from db 

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isCorr = await verifyPass(pass, user.pass);

    if (!isCorr) {
      return res.status(400).json({
        success: false,
        message: "Wrong Credentials",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not defined");
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};