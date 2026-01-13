import { Button, Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface WorkspaceInvitationEmailProps {
    inviteUrl: string;
    workspaceName: string;
    inviterName: string;
    inviterEmail: string;
    role: string;
    recipientName?: string;
    message?: string;
}

export function WorkspaceInvitationEmail({
    inviteUrl,
    workspaceName,
    inviterName,
    inviterEmail,
    role,
    recipientName,
    message
}: WorkspaceInvitationEmailProps) {
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

    return (
        <EmailLayout
            preview={`${inviterName} invited you to join ${workspaceName} on FlowMaestro`}
            heading="You're invited!"
        >
            <Section style={content}>
                <Text style={paragraph}>{recipientName ? `Hi ${recipientName},` : "Hi,"}</Text>

                <Text style={paragraph}>
                    <strong>{inviterName}</strong> ({inviterEmail}) has invited you to join the{" "}
                    <strong>{workspaceName}</strong> workspace on FlowMaestro as a{" "}
                    <strong>{roleDisplay}</strong>.
                </Text>

                {message && (
                    <Section style={messageBox}>
                        <Text style={messageLabel}>Message from {inviterName}:</Text>
                        <Text style={messageText}>"{message}"</Text>
                    </Section>
                )}

                <Text style={paragraph}>
                    Click the button below to accept this invitation and join the workspace.
                </Text>

                <Button style={button} href={inviteUrl}>
                    Accept Invitation
                </Button>

                <Text style={paragraph}>This invitation will expire in 7 days.</Text>

                <Text style={smallText}>
                    If you don't want to join this workspace, you can safely ignore this email. If
                    you believe this invitation was sent in error, please contact the person who
                    invited you.
                </Text>
            </Section>
        </EmailLayout>
    );
}

const content = {
    padding: "0 40px"
};

const paragraph = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginBottom: "16px"
};

const button = {
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    width: "100%",
    padding: "12px 0",
    marginTop: "24px",
    marginBottom: "24px"
};

const messageBox = {
    backgroundColor: "#f4f4f5",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px"
};

const messageLabel = {
    color: "#71717a",
    fontSize: "12px",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    marginBottom: "8px"
};

const messageText = {
    color: "#525f7f",
    fontSize: "14px",
    lineHeight: "20px",
    fontStyle: "italic" as const,
    margin: 0
};

const smallText = {
    color: "#71717a",
    fontSize: "14px",
    lineHeight: "20px",
    textAlign: "left" as const,
    marginTop: "24px"
};
