import type { Response, NextFunction } from "express";

export const isRecruiter = (req: any, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "Recruiter") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only recruiters can perform this action.",
    });
  }
};

export const isStudent = (req: any, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "Student") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only students can perform this action.",
    });
  }
};