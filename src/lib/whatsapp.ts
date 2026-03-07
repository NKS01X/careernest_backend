import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode"; // npm install qrcode @types/qrcode

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

client.on("qr", async (qr) => {
    console.log("[WhatsApp] Scan this QR code to authenticate:");
    const url = await qrcode.toDataURL(qr);
    console.log("[WhatsApp] Copy the line below and paste it in your browser address bar, then scan:");
    console.log(url); // data:image/png;base64,....
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