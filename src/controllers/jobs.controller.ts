import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import { createJobWithEmbedding } from "../services/job.service.js";

export const getAllJobs = async (req: Request, res: Response): Promise<any> => {
  try {
    const jobs = await prisma.job.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
};

export const getJobById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } }
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    return res.status(200).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching job" });
  }
};

export const getMyJobs = async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let jobs;
    if (role === "Recruiter") {
      jobs = await prisma.job.findMany({
        where: { createdById: userId }
      });
    } else {
      jobs = await prisma.application.findMany({
        where: { userId },
        include: { job: true }
      });
    }
    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching your jobs" });
  }
};

export const createJob = async (req: any, res: Response): Promise<any> => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({ message: "Only recruiters can post jobs" });
    }
    const { title, company, description, location, salary, requiredExperience } = req.body;

    const newJob = await createJobWithEmbedding({
      title,
      company,
      description,
      location,
      salary,
      requiredExperience: requiredExperience ? Number(requiredExperience) : 0,
      createdById: req.user.id,
    });

    return res.status(201).json({ success: true, job: newJob });
  } catch (error) {
    console.error("[createJob] Error:", error);
    return res.status(500).json({ success: false, message: "Error creating job" });
  }
};