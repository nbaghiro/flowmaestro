/**
 * EmailService Tests
 *
 * Tests for email delivery service using Resend (EmailService.ts)
 */

// Mock config
jest.mock("../../../core/config", () => ({
    config: {
        resend: {
            apiKey: "re_test_123"
        },
        appUrl: "https://app.flowmaestro.ai"
    }
}));

// Mock Resend
const mockSend = jest.fn();
jest.mock("resend", () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: {
            send: mockSend
        }
    }))
}));

// Mock email templates (TSX files)
const mockPasswordResetEmail = jest.fn().mockReturnValue("<html>Password Reset</html>");
const mockEmailVerificationEmail = jest.fn().mockReturnValue("<html>Email Verification</html>");
const mockPasswordChangedEmail = jest.fn().mockReturnValue("<html>Password Changed</html>");
const mockNameChangedEmail = jest.fn().mockReturnValue("<html>Name Changed</html>");
const mockEmailChangedEmail = jest.fn().mockReturnValue("<html>Email Changed</html>");
const mockTwoFactorEnabledEmail = jest.fn().mockReturnValue("<html>2FA Enabled</html>");
const mockTwoFactorDisabledEmail = jest.fn().mockReturnValue("<html>2FA Disabled</html>");
const mockWorkspaceInvitationEmail = jest.fn().mockReturnValue("<html>Workspace Invitation</html>");

jest.mock("../templates/PasswordResetEmail.tsx", () => ({
    PasswordResetEmail: (...args: unknown[]) => mockPasswordResetEmail(...args)
}));

jest.mock("../templates/EmailVerificationEmail.tsx", () => ({
    EmailVerificationEmail: (...args: unknown[]) => mockEmailVerificationEmail(...args)
}));

jest.mock("../templates/PasswordChangedEmail.tsx", () => ({
    PasswordChangedEmail: (...args: unknown[]) => mockPasswordChangedEmail(...args)
}));

jest.mock("../templates/NameChangedEmail.tsx", () => ({
    NameChangedEmail: (...args: unknown[]) => mockNameChangedEmail(...args)
}));

jest.mock("../templates/EmailChangedEmail.tsx", () => ({
    EmailChangedEmail: (...args: unknown[]) => mockEmailChangedEmail(...args)
}));

jest.mock("../templates/TwoFactorEnabledEmail.tsx", () => ({
    TwoFactorEnabledEmail: (...args: unknown[]) => mockTwoFactorEnabledEmail(...args)
}));

jest.mock("../templates/TwoFactorDisabledEmail.tsx", () => ({
    TwoFactorDisabledEmail: (...args: unknown[]) => mockTwoFactorDisabledEmail(...args)
}));

jest.mock("../templates/WorkspaceInvitationEmail.tsx", () => ({
    WorkspaceInvitationEmail: (...args: unknown[]) => mockWorkspaceInvitationEmail(...args)
}));

import { EmailService } from "../EmailService";

describe("EmailService", () => {
    let service: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockResolvedValue({ id: "email-123" });
        service = new EmailService();
    });

    describe("sendPasswordResetEmail", () => {
        it("should send password reset email with default from address", async () => {
            await service.sendPasswordResetEmail("user@example.com", "reset-token-123", "John");

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Reset your FlowMaestro password",
                react: expect.anything()
            });

            expect(mockPasswordResetEmail).toHaveBeenCalledWith({
                resetUrl: "https://app.flowmaestro.ai/reset-password?token=reset-token-123",
                userName: "John"
            });
        });

        it("should send password reset email with custom from address", async () => {
            await service.sendPasswordResetEmail(
                "user@example.com",
                "token",
                undefined,
                "Custom <custom@example.com>"
            );

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "Custom <custom@example.com>"
                })
            );
        });

        it("should send without username", async () => {
            await service.sendPasswordResetEmail("user@example.com", "token");

            expect(mockPasswordResetEmail).toHaveBeenCalledWith({
                resetUrl: expect.any(String),
                userName: undefined
            });
        });
    });

    describe("sendEmailVerification", () => {
        it("should send signup verification email", async () => {
            await service.sendEmailVerification("user@example.com", "verify-token-456", "Jane");

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Verify your FlowMaestro email",
                react: expect.anything()
            });

            expect(mockEmailVerificationEmail).toHaveBeenCalledWith({
                verificationUrl: "https://app.flowmaestro.ai/verify-email?token=verify-token-456",
                userName: "Jane",
                context: "signup"
            });
        });

        it("should send change-email verification", async () => {
            await service.sendEmailVerification(
                "new@example.com",
                "token",
                "Jane",
                undefined,
                "change-email"
            );

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "Confirm your new FlowMaestro email"
                })
            );

            expect(mockEmailVerificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: "change-email"
                })
            );
        });

        it("should use custom from address", async () => {
            await service.sendEmailVerification(
                "user@example.com",
                "token",
                undefined,
                "Custom <noreply@custom.com>"
            );

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "Custom <noreply@custom.com>"
                })
            );
        });
    });

    describe("sendPasswordChangedNotification", () => {
        it("should send password changed notification", async () => {
            await service.sendPasswordChangedNotification("user@example.com", "John");

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Your FlowMaestro password was changed",
                react: expect.anything()
            });

            expect(mockPasswordChangedEmail).toHaveBeenCalledWith({ userName: "John" });
        });
    });

    describe("sendNameChangedNotification", () => {
        it("should send name changed notification", async () => {
            await service.sendNameChangedNotification("user@example.com", "New Name");

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Your FlowMaestro profile name was changed",
                react: expect.anything()
            });

            expect(mockNameChangedEmail).toHaveBeenCalledWith({ userName: "New Name" });
        });
    });

    describe("sendEmailChangedNotification", () => {
        it("should send email changed notification to both addresses", async () => {
            await service.sendEmailChangedNotification(
                "old@example.com",
                "new@example.com",
                "John"
            );

            // Should send to old email
            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "old@example.com",
                subject: "Your FlowMaestro email was changed",
                react: expect.anything()
            });

            // Should send to new email
            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "new@example.com",
                subject: "Your FlowMaestro email was changed",
                react: expect.anything()
            });

            expect(mockSend).toHaveBeenCalledTimes(2);

            expect(mockEmailChangedEmail).toHaveBeenCalledWith({
                userName: "John",
                isOldAddress: true,
                newEmail: "new@example.com"
            });
        });
    });

    describe("sendTwoFactorEnabledNotification", () => {
        it("should send 2FA enabled notification with backup codes", async () => {
            const backupCodes = ["CODE1", "CODE2", "CODE3"];

            await service.sendTwoFactorEnabledNotification(
                "user@example.com",
                "+1234567890",
                backupCodes,
                "John"
            );

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Two-factor authentication enabled",
                react: expect.anything()
            });

            expect(mockTwoFactorEnabledEmail).toHaveBeenCalledWith({
                phone: "+1234567890",
                backupCodes
            });
        });

        it("should send 2FA enabled notification without backup codes", async () => {
            await service.sendTwoFactorEnabledNotification("user@example.com", "+1234567890");

            expect(mockTwoFactorEnabledEmail).toHaveBeenCalledWith({
                phone: "+1234567890",
                backupCodes: undefined
            });
        });
    });

    describe("sendTwoFactorDisabledNotification", () => {
        it("should send 2FA disabled notification", async () => {
            await service.sendTwoFactorDisabledNotification("user@example.com", "John");

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "user@example.com",
                subject: "Two-factor authentication disabled",
                react: expect.anything()
            });

            expect(mockTwoFactorDisabledEmail).toHaveBeenCalled();
        });
    });

    describe("sendWorkspaceInvitation", () => {
        it("should send workspace invitation with all fields", async () => {
            await service.sendWorkspaceInvitation(
                "invitee@example.com",
                "invite-token-789",
                "Acme Corp",
                "John Doe",
                "john@acme.com",
                "editor",
                "Jane",
                "Welcome to the team!"
            );

            expect(mockSend).toHaveBeenCalledWith({
                from: "FlowMaestro <noreply@flowmaestro.ai>",
                to: "invitee@example.com",
                subject: "You're invited to join Acme Corp on FlowMaestro",
                react: expect.anything()
            });

            expect(mockWorkspaceInvitationEmail).toHaveBeenCalledWith({
                inviteUrl: "https://app.flowmaestro.ai/accept-invitation?token=invite-token-789",
                workspaceName: "Acme Corp",
                inviterName: "John Doe",
                inviterEmail: "john@acme.com",
                role: "editor",
                recipientName: "Jane",
                message: "Welcome to the team!"
            });
        });

        it("should send invitation without optional fields", async () => {
            await service.sendWorkspaceInvitation(
                "invitee@example.com",
                "token",
                "Workspace",
                "Inviter",
                "inviter@example.com",
                "viewer"
            );

            expect(mockWorkspaceInvitationEmail).toHaveBeenCalledWith({
                inviteUrl: expect.any(String),
                workspaceName: "Workspace",
                inviterName: "Inviter",
                inviterEmail: "inviter@example.com",
                role: "viewer",
                recipientName: undefined,
                message: undefined
            });
        });

        it("should use custom from address", async () => {
            await service.sendWorkspaceInvitation(
                "invitee@example.com",
                "token",
                "Workspace",
                "Inviter",
                "inviter@example.com",
                "viewer",
                undefined,
                undefined,
                "Custom <custom@example.com>"
            );

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "Custom <custom@example.com>"
                })
            );
        });
    });

    describe("Error handling", () => {
        it("should propagate Resend errors", async () => {
            mockSend.mockRejectedValue(new Error("Resend API error"));

            await expect(
                service.sendPasswordResetEmail("user@example.com", "token")
            ).rejects.toThrow("Resend API error");
        });
    });
});
