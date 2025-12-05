import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

export function TwoFactorEnabledEmail({ phone }: { phone: string }) {
    return (
        <EmailLayout
            preview="Two-factor authentication enabled"
            heading="Two-factor authentication enabled"
        >
            <Section style={content}>
                <Text style={paragraph}>
                    Two-factor authentication has been successfully enabled on your FlowMaestro
                    account.
                </Text>

                <Text style={paragraph}>
                    Phone number: <strong>{phone}</strong>
                </Text>

                <Text style={paragraph}>
                    If you didn't enable 2FA, please disable it and secure your account immediately.
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
