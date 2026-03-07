import { BrevoClient } from "@getbrevo/brevo";

interface EmailResult {
    success: boolean;
    messageId: string;
}

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY!,
});

export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string
): Promise<EmailResult> {
    if (!process.env.BREVO_API_KEY) {
        console.warn("[EmailService] BREVO_API_KEY not set. Email not sent.");
        return { success: false, messageId: "" };
    }

    try {
        const response = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                email: process.env.EMAIL_FROM ?? "nikhilsingh9b21@gmail.com",
                name: "CareerNest",
            },
            to: [{ email: to }],
            subject,
            textContent: text,
            ...(html && { htmlContent: html }),
        });

        console.log(`[EmailService] Email sent to ${to} | ID: ${response.messageId}`);
        return { success: true, messageId: response.messageId ?? "" };
    } catch (error) {
        console.error(`[EmailService] Send Error for ${to}:`, error);
        return { success: false, messageId: "" };
    }
}