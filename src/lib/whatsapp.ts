import pkg from "whatsapp-web.js";
const { Client, RemoteAuth } = pkg;
import { Pool } from "pg";
import PostgresStore from "wwebjs-postgres";
import * as qrcode from "qrcode";

// Connect to your existing Render PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const store = new PostgresStore({ pool });

export let isClientReady = false;

export const client = new Client({
    authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000,
    }),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
        ],
    },
});

client.on("qr", async (qr) => {
    console.log("[WhatsApp] New QR received. Paste the line below into your browser address bar:");
    const url = await qrcode.toDataURL(qr);
    console.log(url);
});

client.on("remote_session_saved", () => {
    console.log("[WhatsApp] Session saved to PostgreSQL ✅ You won't need to scan again!");
});

client.on("ready", () => {
    isClientReady = true;
    console.log("[WhatsApp] Client is ready!");
});

client.on("authenticated", () => {
    console.log("[WhatsApp] Authenticated successfully.");
});

client.on("auth_failure", (msg) => {
    console.error("[WhatsApp] Authentication failure:", msg);
});

client.on("disconnected", (reason) => {
    isClientReady = false;
    console.warn("[WhatsApp] Disconnected:", reason);
});

console.log("[WhatsApp] Initializing client...");
client.initialize().catch(err => {
    console.error("[WhatsApp] Initialization failed:", err);
});