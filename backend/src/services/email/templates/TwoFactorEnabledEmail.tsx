import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

export function TwoFactorEnabledEmail({
    phone,
    backupCodes
}: {
    phone: string;
    backupCodes?: string[];
}) {
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

                {backupCodes && backupCodes.length > 0 ? (
                    <div style={{ marginBottom: "16px" }}>
                        <Text style={paragraph}>
                            Here are your backup codes (store them safely):
                        </Text>
                        <ul style={list}>
                            {backupCodes.map((code) => (
                                <li key={code} style={listItem}>
                                    <code style={codeStyle}>{code}</code>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

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

const list = {
    paddingLeft: "20px",
    margin: 0
};

const listItem = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "6px"
};

const codeStyle = {
    fontFamily: "monospace",
    backgroundColor: "#f5f5f5",
    padding: "4px 6px",
    borderRadius: "4px"
};
