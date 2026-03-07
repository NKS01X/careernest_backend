import nodemailer from "nodemailer";

interface EmailResult {
    success: boolean;
    messageId: string;
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string
): Promise<EmailResult> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[EmailService] EMAIL_USER or EMAIL_PASS not set. Email not sent.");
        return { success: false, messageId: "" };
    }

    try {
        const info = await transporter.sendMail({
            from: `"CareerNest" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(`[EmailService] Email sent to ${to} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EmailService] Send Error for ${to}:`, error);
        return { success: false, messageId: "" };
    }
}
