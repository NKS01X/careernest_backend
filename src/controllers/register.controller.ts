import type { Request, Response } from "express";
import { encrypt } from "../utils/utils.js";
import prisma from "../lib/db.js";

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, pass, phone, role } = req.body;

    if (!name || !email || !pass || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (name, email, pass, phone, role)",
      });
    }

    if (pass.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: phone }
        ],
      },
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User with this email or phone number already exists",
      });
    }

    const hashedPass = await encrypt(pass);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        pass: hashedPass,
        phone,
        role,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};