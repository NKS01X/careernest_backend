import { client } from "../lib/whatsapp.js";

/**
 * Sends a WhatsApp message using the in-process whatsapp-web.js client.
 * The client must be connected (QR scanned) before this will work.
 */
export async function sendWhatsAppMessage(
    phone: string,
    message: string
): Promise<{ success: boolean; messageId: string }> {
    const chatId = `${phone}@c.us`;
    const result = await client.sendMessage(chatId, message);

    const messageId = result.id?.id ?? `wa_${Date.now()}`;
    console.log(`[WhatsApp] Message sent to ${phone} | messageId: ${messageId}`);

    return { success: true, messageId };
}
