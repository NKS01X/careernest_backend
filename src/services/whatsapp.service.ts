import { client, isClientReady } from "../lib/whatsapp.js";

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