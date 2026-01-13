import { Resend } from "resend";
import { config } from "../../core/config";
import { EmailChangedEmail } from "./templates/EmailChangedEmail";
import { EmailVerificationEmail } from "./templates/EmailVerificationEmail";
import { NameChangedEmail } from "./templates/NameChangedEmail";
import { PasswordChangedEmail } from "./templates/PasswordChangedEmail";
import { PasswordResetEmail } from "./templates/PasswordResetEmail";
import { TwoFactorDisabledEmail } from "./templates/TwoFactorDisabledEmail";
import { TwoFactorEnabledEmail } from "./templates/TwoFactorEnabledEmail";
import { WorkspaceInvitationEmail } from "./templates/WorkspaceInvitationEmail";

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
        const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

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
        from?: string,
        context: "signup" | "change-email" = "signup"
    ): Promise<void> {
        const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;
        const subject =
            context === "change-email"
                ? "Confirm your new FlowMaestro email"
                : "Verify your FlowMaestro email";

        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject,
            react: EmailVerificationEmail({ verificationUrl, userName, context })
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
        backupCodes?: string[],
        _userName?: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Two-factor authentication enabled",
            react: TwoFactorEnabledEmail({ phone, backupCodes })
        });
    }

    async sendTwoFactorDisabledNotification(
        email: string,
        _userName?: string,
        from?: string
    ): Promise<void> {
        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: "Two-factor authentication disabled",
            react: TwoFactorDisabledEmail()
        });
    }

    async sendWorkspaceInvitation(
        email: string,
        token: string,
        workspaceName: string,
        inviterName: string,
        inviterEmail: string,
        role: string,
        recipientName?: string,
        message?: string,
        from?: string
    ): Promise<void> {
        const inviteUrl = `${config.appUrl}/accept-invitation?token=${token}`;

        await this.resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: email,
            subject: `You're invited to join ${workspaceName} on FlowMaestro`,
            react: WorkspaceInvitationEmail({
                inviteUrl,
                workspaceName,
                inviterName,
                inviterEmail,
                role,
                recipientName,
                message
            })
        });
    }
}

// Singleton instance
export const emailService = new EmailService();
