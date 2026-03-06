import type { Request, Response } from "express";
import { encrypt } from "../utils/utils.js";
import prisma from "../lib/db.js";
import { parseResumeToJSON } from "../utils/resumeParser.js";
import { generateEmbedding } from "../services/embedding.service.js";

// parser to handle unpredictable LLM date strings
const parseDate = (dateStr: string | null | undefined) => {
  if (!dateStr || dateStr.toLowerCase() === "null" || dateStr.toLowerCase() === "present") return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

export const register = async (req: Request & { file?: any }, res: Response): Promise<any> => {
  try {
    const { name, email, pass, phone, role } = req.body;

    if (!name || !email || !pass || !phone || !role) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    if (pass.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
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

    if (role === "Student") {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Students must upload a resume PDF" });
      }

      const resumeData = await parseResumeToJSON(req.file.buffer);

      const formattedWorkExp = resumeData.workExp.map((exp: any) => ({
        company: exp.company,
        role: exp.role,
        description: exp.description,
        startDate: parseDate(exp.startDate) || new Date(),
        endDate: parseDate(exp.endDate),
      }));

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
        role,
        ...(resumePayload && { resume: resumePayload }),
      },
      include: { resume: true },
    });

    // Generate and store resume embedding for Students
    if (role === "Student" && user.resume) {
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

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: user.id,
    });

  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};