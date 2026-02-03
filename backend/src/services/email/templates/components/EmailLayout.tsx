import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import React from "react";

interface EmailLayoutProps {
    preview: string;
    heading: string;
    // Using any due to React types version mismatch between @types/react and @react-email/components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: any;
}

export function EmailLayout({ preview, heading, children }: EmailLayoutProps) {
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo */}
                    <div style={logoContainer}>
                        <div style={logoBox}>
                            <Text style={logoText}>FM</Text>
                        </div>
                    </div>

                    {/* Heading */}
                    <Heading style={h1}>{heading}</Heading>

                    {/* Content */}
                    {children}

                    {/* Footer */}
                    <Text style={footer}>
                        FlowMaestro - Workflow Automation Platform
                        <br />
                        This is an automated email. Please do not reply.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    maxWidth: "560px"
};

const logoContainer = {
    textAlign: "center" as const,
    marginTop: "32px",
    marginBottom: "32px"
};

const logoBox = {
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    display: "inline-block",
    padding: "12px 20px"
};

const logoText = {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0"
};

const h1 = {
    color: "#1f2937",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "32px 0",
    padding: "0 40px",
    textAlign: "center" as const
};

const footer = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    textAlign: "center" as const,
    marginTop: "48px"
};
