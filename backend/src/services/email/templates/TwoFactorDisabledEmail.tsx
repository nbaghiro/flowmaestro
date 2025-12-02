import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

export function TwoFactorDisabledEmail() {
    return (
        <EmailLayout
            preview="Two-factor authentication disabled"
            heading="Two-factor authentication disabled"
        >
            <Section style={content}>
                <Text style={paragraph}>
                    Two-factor authentication has been disabled on your FlowMaestro account.
                </Text>

                <Text style={paragraph}>
                    If you did not disable 2FA, please re-enable it and secure your account
                    immediately.
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
