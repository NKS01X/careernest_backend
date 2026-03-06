import { Client, LocalAuth } from "whatsapp-web.js";

/**
 * Singleton whatsapp-web.js client.
 *
 * Uses LocalAuth so the session is persisted to disk under
 * `.wwebjs_auth/` – after a one-time QR scan the client
 * will reconnect automatically on subsequent starts.
 */
export const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    },
});

/* ── lifecycle logging ─────────────────────────────────── */

client.on("qr", (qr) => {
    console.log("[WhatsApp] Scan this QR code to authenticate:");
    console.log(qr);
});

client.on("ready", () => {
    console.log("[WhatsApp] Client is ready!");
});

client.on("authenticated", () => {
    console.log("[WhatsApp] Authenticated successfully.");
});

client.on("auth_failure", (msg) => {
    console.error("[WhatsApp] Authentication failure:", msg);
});

client.on("disconnected", (reason) => {
    console.warn("[WhatsApp] Disconnected:", reason);
});
