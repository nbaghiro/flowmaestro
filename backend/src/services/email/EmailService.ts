import { Resend } from "resend";
import { config } from "../../core/config";
import { EmailChangedEmail } from "./templates/EmailChangedEmail";
import { EmailVerificationEmail } from "./templates/EmailVerificationEmail";
import { NameChangedEmail } from "./templates/NameChangedEmail";
import { PasswordChangedEmail } from "./templates/PasswordChangedEmail";
import { PasswordResetEmail } from "./templates/PasswordResetEmail";
import { TwoFactorDisabledEmail } from "./templates/TwoFactorDisabledEmail";
import { TwoFactorEnabledEmail } from "./templates/TwoFactorEnabledEmail";

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

    async sendNameChangedNotification(
        email: string,
        userName: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Your FlowMaestro profile name was changed",
            react: NameChangedEmail({ userName })
        });
    }

    async sendEmailChangedNotification(
        oldEmail: string,
        newEmail: string,
        userName: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: oldEmail,
            subject: "Your FlowMaestro email was changed",
            react: EmailChangedEmail({ userName, isOldAddress: true, newEmail })
        });

        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: newEmail,
            subject: "Your FlowMaestro email was changed",
            react: EmailChangedEmail({ userName, isOldAddress: true, newEmail })
        });
    }

    async sendTwoFactorEnabledNotification(
        email: string,
        phone: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Two-factor authentication enabled",
            react: TwoFactorEnabledEmail({ phone })
        });
    }

    async sendTwoFactorDisabledNotification(email: string, from?: string): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Two-factor authentication disabled",
            react: TwoFactorDisabledEmail()
        });
    }
}

// Singleton instance
export const emailService = new EmailService();
