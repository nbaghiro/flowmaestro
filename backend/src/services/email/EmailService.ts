import { Resend } from "resend";
import { config } from "../../core/config";
import { EmailVerificationEmail } from "./templates/EmailVerificationEmail";
import { PasswordChangedEmail } from "./templates/PasswordChangedEmail";
import { PasswordResetEmail } from "./templates/PasswordResetEmail";

const DEFAULT_FROM_EMAIL = "FlowMaestro <noreply@flowmaestro.ai>";

export class EmailService {
    private resend: Resend;

    constructor() {
        this.resend = new Resend(config.resend.apiKey);
    }

    async sendPasswordResetEmail(
        email: string,
        token: string,
        userName?: string,
        from?: string
    ): Promise<void> {
        const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Reset your FlowMaestro password",
            react: PasswordResetEmail({ resetUrl, userName })
        });
    }

    async sendEmailVerification(
        email: string,
        token: string,
        userName?: string,
        from?: string
    ): Promise<void> {
        const verificationUrl = `${config.frontend.url}/verify-email?token=${token}`;

        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Verify your FlowMaestro email",
            react: EmailVerificationEmail({ verificationUrl, userName })
        });
    }

    async sendPasswordChangedNotification(
        email: string,
        userName?: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Your FlowMaestro password was changed",
            react: PasswordChangedEmail({ userName })
        });
    }
}

// Singleton instance
export const emailService = new EmailService();
