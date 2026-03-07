import type { Request, Response } from "express";
import { encrypt } from "../utils/utils.js";
import prisma from "../lib/db.js";
import { parseResumeToJSON } from "../utils/resumeParser.js";
import { generateEmbedding } from "../services/embedding.service.js";
import jwt from "jsonwebtoken";

// parser to handle unpredictable LLM date strings
const parseDate = (dateStr: string | null | undefined) => {
  if (!dateStr || dateStr.toLowerCase() === "null" || dateStr.toLowerCase() === "present") return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

export const register = async (req: Request & { file?: any }, res: Response): Promise<any> => {
  try {
    const { name, email, role } = req.body;
    const pass = req.body.pass || req.body.password;
    const phone = req.body.phone ? String(req.body.phone) : undefined;

    if (!name || !email || !pass || !phone || !role) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    if (String(pass).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    let userRole = role;
    if (typeof role === 'string') {
      const lower = role.toLowerCase();
      if (lower === 'student') userRole = 'Student';
      if (lower === 'recruiter') userRole = 'Recruiter';
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone: phone }] },
    });

    if (exists) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPass = await encrypt(pass);

    let resumePayload: any;

    if (userRole === "Student") {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Students must upload a resume PDF" });
      }

      const resumeData = await parseResumeToJSON(req.file.buffer);

      const formattedWorkExp = resumeData.workExp?.map((exp: any) => ({
        company: exp.company,
        role: exp.role,
        description: exp.description,
        startDate: parseDate(exp.startDate) || new Date(),
        endDate: parseDate(exp.endDate),
      })) || [];

      resumePayload = {
        create: {
          skills: resumeData.skills || [],
          achievements: resumeData.achievements || [],
          projects: { create: resumeData.projects || [] },
          workExp: { create: formattedWorkExp || [] },
        }
      };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        pass: hashedPass,
        phone,
        role: userRole as "Student" | "Recruiter",
        ...(resumePayload && { resume: resumePayload }),
      },
      include: { resume: true },
    });

    // Generate and store resume embedding for Students
    if (userRole === "Student" && user.resume) {
      try {
        const resumeText = [
          ...(user.resume.skills || []),
          ...(user.resume.achievements || []),
        ].join(". ");

        const embedding = await generateEmbedding(resumeText || name);
        const embeddingStr = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE "Resume" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          user.resume.id
        );

        console.log(`[Register] Generated ${embedding.length}-dim embedding for ${name}'s resume`);
      } catch (embedErr) {
        console.error("[Register] Resume embedding failed (non-fatal):", embedErr);
        // Don't block registration if embedding fails
      }
    }

    const secret = process.env.SECRET || "careernest_dev_secret";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      },
      secret,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        resume: user.resume,
      },
    });

  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};