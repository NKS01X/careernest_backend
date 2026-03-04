/**
 * Mock WhatsApp message sender.
 * gotta replace this with a real Twilio / Meta WhatsApp Business API call in production.
 */
export async function sendWhatsAppMessage(
    phone: string,
    message: string
): Promise<{ success: boolean; messageId: string }> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 200));

    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log(`[WhatsApp Mock] Message sent to ${phone}:`);
    console.log(`  MessageID: ${messageId}`);
    console.log(`  Content: ${message}`);

    return { success: true, messageId };
}
