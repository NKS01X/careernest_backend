import type { Request, Response } from "express";

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};