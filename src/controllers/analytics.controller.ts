import type { Request, Response } from "express";
import prisma from "../lib/db.js";

// Make sure to match the type used in auth.ts
interface AuthRequest extends Request {
    user?: {
        id: string;
        role: "Student" | "Recruiter";
        // other fields omitted for brevity
    };
}

export const getMyAnalytics = async (
    req: AuthRequest,
    res: Response
): Promise<any> => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (user.role === "Student") {
            // 1. Applications Count
            const totalApplications = await prisma.application.count({
                where: { userId: user.id },
            });

            // 2. Resumes Uploaded
            const resumesUploaded = await prisma.resume.count({
                where: { userId: user.id },
            });

            // Fetch resume data if it exists for skills, projects, and work experience
            const userResume = await prisma.resume.findUnique({
                where: { userId: user.id },
                include: {
                    projects: true,
                    workExp: true,
                },
            });

            const skillsCount = userResume?.skills.length || 0;
            const projectsCount = userResume?.projects.length || 0;
            const experienceCount = userResume?.workExp.length || 0;

            // 3. Total Matches (JobMatches would ideally come from a specific 'Match' table if it existed,
            // but based on schema, we might need to rely on resumes tracking logic or just return 0 if there isn't one.
            // The prompt asks for "number of matched jobs for the student's resume", which usually implies a job match feature.
            // Looking at the schema, there is no Match table. 'totalMatches' might need to be 0 or calculated based on embedding if that was the intent.
            // Since evaluating embeddings on the fly for all jobs is heavy, we'll return 0 for now as a placeholder unless there is a specific match table.
            const totalMatches = 0; // Placeholder as per schema

            // 4. Recent Applications (Last 5)
            const recentApplications = await prisma.application.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    job: {
                        select: {
                            title: true,
                            company: true,
                        },
                    },
                },
            });

            return res.json({
                success: true,
                analytics: {
                    totalApplications,
                    totalMatches,
                    resumesUploaded,
                    skillsCount,
                    projectsCount,
                    experienceCount,
                    recentApplications,
                },
            });
        }

        if (user.role === "Recruiter") {
            // 1. Total Jobs Posted
            const totalJobsPosted = await prisma.job.count({
                where: { createdById: user.id },
            });

            // 2. Fetch all jobs belonging to the recruiter with application counts
            const jobsData = await prisma.job.findMany({
                where: { createdById: user.id },
                select: {
                    id: true,
                    title: true,
                    _count: {
                        select: { applications: true },
                    },
                },
            });

            // Calculate total applications derived from the jobs fetched
            let totalApplicationsReceived = 0;
            const jobs = jobsData.map((job) => {
                const applicationsCount = job._count.applications;
                totalApplicationsReceived += applicationsCount;
                return {
                    jobId: job.id,
                    title: job.title,
                    applicationsCount,
                };
            });

            // 3. Total Matches Generated
            // Similar to Student, there's no explicit schema for matches generated per recruiter/job.
            const totalMatchesGenerated = 0; // Placeholder as per schema

            return res.json({
                success: true,
                analytics: {
                    totalJobsPosted,
                    totalApplicationsReceived,
                    totalMatchesGenerated,
                    jobs,
                },
            });
        }

        return res.status(403).json({ message: "Invalid role" });
    } catch (error) {
        console.error("Analytics Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
