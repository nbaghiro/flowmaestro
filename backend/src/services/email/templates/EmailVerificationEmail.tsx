import { Button, Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface EmailVerificationEmailProps {
    verificationUrl: string;
    userName?: string;
    context?: "signup" | "change-email";
}

export function EmailVerificationEmail({
    verificationUrl,
    userName,
    context = "signup"
}: EmailVerificationEmailProps) {
    const isEmailChange = context === "change-email";
    const heading = isEmailChange ? "Confirm your new email" : "Verify your email";
    const preview = isEmailChange
        ? "Confirm your new FlowMaestro email address"
        : "Verify your FlowMaestro email address";

    return (
        <EmailLayout preview={preview} heading={heading}>
            <Section style={content}>
                {isEmailChange ? (
                    <>
                        <Text style={paragraph}>
                            Hi {userName || "there"}, you requested to update the email on your
                            FlowMaestro account.
                        </Text>
                        <Text style={paragraph}>
                            Please confirm this new email address so we can finish the change. Once
                            confirmed, you’ll sign in with this email moving forward.
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={paragraph}>
                            {userName ? `Welcome ${userName}!` : "Welcome!"}
                        </Text>

                        <Text style={paragraph}>
                            Thanks for signing up for FlowMaestro. To complete your registration and
                            get full access to all features, please verify your email address by
                            clicking the button below.
                        </Text>
                    </>
                )}

                <Button style={button} href={verificationUrl}>
                    {isEmailChange ? "Confirm new email" : "Verify email address"}
                </Button>

                <Text style={paragraph}>This link will expire in 15 minutes.</Text>

                <Text style={paragraph}>
                    {isEmailChange
                        ? "If you didn’t request this change, you can safely ignore this email and your account email will stay the same."
                        : "If you didn't create a FlowMaestro account, you can safely ignore this email."}
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
