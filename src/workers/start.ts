/**
 * Worker entry point.
 * Run this file to start both BullMQ workers:
 *   npx tsx src/workers/start.ts
 */
import dotenv from "dotenv";
dotenv.config();

// Importing the workers registers them with BullMQ
import "./jobMatching.worker.js";
import "./notification.worker.js";

console.log("[Workers] All workers started. Waiting for jobs...");
