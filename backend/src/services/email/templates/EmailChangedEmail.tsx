import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface EmailChangedEmailProps {
    userName?: string;
    isOldAddress: boolean;
    newEmail: string;
}

export function EmailChangedEmail({ userName, isOldAddress, newEmail }: EmailChangedEmailProps) {
    return (
        <EmailLayout preview="Your FlowMaestro email was updated" heading="Email updated">
            <Section style={content}>
                <Text style={paragraph}>Hi {userName || "there"},</Text>

                {isOldAddress ? (
                    <Text style={paragraph}>
                        Your FlowMaestro account email was recently changed from this address to:{" "}
                        <strong>{newEmail}</strong>
                    </Text>
                ) : (
                    <Text style={paragraph}>
                        Your FlowMaestro account email has been successfully updated to:{" "}
                        <strong>{newEmail}</strong>
                    </Text>
                )}

                <Text style={paragraph}>
                    If you didn’t make this change, please secure your account immediately.
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
