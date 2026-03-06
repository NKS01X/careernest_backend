import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/db.js";
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

    const user = await prisma.user.findUnique({
      where: { email: email }
    }); //fetch from db 

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
    const secret = process.env.SECRET || "careernest_dev_secret";

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
      },
      secret,
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
        id: user.id,
        username: user.name,
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