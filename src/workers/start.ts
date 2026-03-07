/**
 * Worker entry point.
 * Run this file to start both BullMQ workers:
 *   npx tsx src/workers/start.ts
 */
import dotenv from "dotenv";
dotenv.config();

import http from "http";

// Importing the workers registers them with BullMQ
import "./jobMatching.worker.js";
import "./notification.worker.js";

// Minimal HTTP server so Render Web Service doesn't kill the process
// Render requires a port to be bound — this satisfies that requirement
const PORT = process.env.PORT || 3001;
http
    .createServer((_, res) => {
        res.writeHead(200);
        res.end("ok");
    })
    .listen(PORT, () => {
        console.log(`[Workers] Health check server listening on port ${PORT}`);
    });

console.log("[Workers] All workers started. Waiting for jobs...");