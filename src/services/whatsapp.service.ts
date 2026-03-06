import { client } from "../lib/whatsapp.js";

/**
 * Sends a WhatsApp message using the in-process whatsapp-web.js client.
 * The client must be connected (QR scanned) before this will work.
 */
export async function sendWhatsAppMessage(
    phone: string,
    message: string
): Promise<{ success: boolean; messageId: string }> {
    // Strip non-digit characters (e.g. +, -, spaces)
    const sanitized = phone.replace(/\D/g, "");
    const chatId = `${sanitized}@c.us`;

    try {
        const info = client.info;  // throws if not ready
        if (!info) throw new Error("Client not ready");

        const result = await client.sendMessage(chatId, message);
        const messageId = result.id?.id ?? `wa_${Date.now()}`;
        console.log(`[WhatsApp] Message sent to ${sanitized} | messageId: ${messageId}`);
        return { success: true, messageId };
    } catch (err) {
        console.error(`[WhatsApp] Failed to send message to ${sanitized}:`, err);
        throw err;
    }
}
