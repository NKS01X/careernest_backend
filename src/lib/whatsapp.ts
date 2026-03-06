import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

/**
 * Singleton whatsapp-web.js client.
 */
export let isClientReady = false;

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

// Start initialization
console.log("[WhatsApp] Initializing client...");
client.initialize().catch(err => {
    console.error("[WhatsApp] Initialization failed:", err);
});
