import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
const { Client, LocalAuth } = pkg;

/**
 * WhatsApp Client Initialization
 * Configured for Linux/Railway environments
 */
export const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Points to the Chromium installed via nixpacks.toml
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

export let isClientReady = false;

// Event Listeners
client.on('qr', (qr) => {
    // In production/Railway, check logs to see the QR link or use a terminal QR library
    console.log('[WhatsApp] QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('[WhatsApp] Client is ready!');
});

client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('[WhatsApp] Client was logged out', reason);
});

// Initialize the client
client.initialize();

/**
 * Sends a WhatsApp message.
 * Ensures the phone number is cleaned and the client is ready.
 */
export async function sendWhatsAppMessage(
    phone: string,
    message: string
): Promise<{ success: boolean; messageId: string }> {
    if (!isClientReady) {
        console.error("[WhatsApp] Attempted to send message before client was ready.");
        return { success: false, messageId: "" };
    }

    // Clean phone number: keep only digits
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;

    try {
        const result = await client.sendMessage(chatId, message);
        const messageId = result.id?.id ?? `wa_${Date.now()}`;
        console.log(`[WhatsApp] Message sent to ${cleanPhone} | ID: ${messageId}`);
        return { success: true, messageId };
    } catch (error) {
        console.error(`[WhatsApp] Send Error for ${phone}:`, error);
        return { success: false, messageId: "" };
    }
}