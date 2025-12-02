import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface NameChangedEmailProps {
    userName?: string;
}

export function NameChangedEmail({ userName }: NameChangedEmailProps) {
    return (
        <EmailLayout
            preview="Your FlowMaestro progile name was updated"
            heading="Profile name updated"
        >
            <Section style={content}>
                <Text style={paragraph}>Hi {userName || "there"},</Text>

                <Text style={paragraph}>
                    This is a confirmation that the name on your FlowMaestro account has been
                    successfully updated.
                </Text>

                <Text style={paragraph}>
                    If you didn't perform this change, please secure your account immediately.
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
