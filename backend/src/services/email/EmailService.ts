import { Resend } from "resend";
import { config } from "../../core/config";
import { EmailVerificationEmail } from "./templates/EmailVerificationEmail";
import { PasswordChangedEmail } from "./templates/PasswordChangedEmail";
import { PasswordResetEmail } from "./templates/PasswordResetEmail";

export class EmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        this.resend = new Resend(config.resend.apiKey);
        this.fromEmail = config.resend.fromEmail;
    }

    async sendPasswordResetEmail(email: string, token: string, userName?: string): Promise<void> {
        const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Reset your FlowMaestro password",
            react: PasswordResetEmail({ resetUrl, userName })
        });
    }

    async sendEmailVerification(email: string, token: string, userName?: string): Promise<void> {
        const verificationUrl = `${config.frontend.url}/verify-email?token=${token}`;

        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Verify your FlowMaestro email",
            react: EmailVerificationEmail({ verificationUrl, userName })
        });
    }

    async sendPasswordChangedNotification(email: string, userName?: string): Promise<void> {
        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Your FlowMaestro password was changed",
            react: PasswordChangedEmail({ userName })
        });
    }
}

// Singleton instance
export const emailService = new EmailService();
