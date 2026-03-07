import dotenv from "dotenv";
dotenv.config();

import http from "http";

import "./jobMatching.worker.js";
import "./email.worker.js";

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