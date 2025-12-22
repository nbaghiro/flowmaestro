import { motion, useInView } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

// Brandfetch Logo API
const BRANDFETCH_CLIENT_ID = "1idCpJZqz6etuVweFEJ";
const getBrandLogo = (domain: string): string =>
    `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

interface Integration {
    name: string;
    logoUrl: string;
}

// Row 1: CRM, Sales, Marketing, E-commerce - Business/Sales focused
const row1Integrations: Integration[] = [
    { name: "Salesforce", logoUrl: getBrandLogo("salesforce.com") },
    { name: "HubSpot", logoUrl: getBrandLogo("hubspot.com") },
    { name: "Shopify", logoUrl: getBrandLogo("shopify.com") },
    { name: "Stripe", logoUrl: getBrandLogo("stripe.com") },
    { name: "Mailchimp", logoUrl: getBrandLogo("mailchimp.com") },
    { name: "Apollo.io", logoUrl: getBrandLogo("apollo.io") },
    { name: "Pipedrive", logoUrl: getBrandLogo("pipedrive.com") },
    { name: "Klaviyo", logoUrl: getBrandLogo("klaviyo.com") },
    { name: "Zendesk", logoUrl: getBrandLogo("zendesk.com") },
    { name: "Intercom", logoUrl: getBrandLogo("intercom.com") },
    { name: "PayPal", logoUrl: getBrandLogo("paypal.com") },
    { name: "Square", logoUrl: getBrandLogo("squareup.com") },
    { name: "QuickBooks", logoUrl: getBrandLogo("quickbooks.intuit.com") },
    { name: "Xero", logoUrl: getBrandLogo("xero.com") },
    { name: "DocuSign", logoUrl: getBrandLogo("docusign.com") },
    { name: "ActiveCampaign", logoUrl: getBrandLogo("activecampaign.com") },
    { name: "Freshdesk", logoUrl: getBrandLogo("freshdesk.com") },
    { name: "Gorgias", logoUrl: getBrandLogo("gorgias.com") }
];

// Row 2: Productivity, Project Management, Communication, Collaboration
const row2Integrations: Integration[] = [
    { name: "Slack", logoUrl: getBrandLogo("slack.com") },
    { name: "Microsoft Teams", logoUrl: getBrandLogo("teams.microsoft.com") },
    { name: "Notion", logoUrl: getBrandLogo("notion.so") },
    { name: "Airtable", logoUrl: getBrandLogo("airtable.com") },
    { name: "Asana", logoUrl: getBrandLogo("asana.com") },
    { name: "Jira", logoUrl: getBrandLogo("atlassian.com/jira") },
    { name: "Trello", logoUrl: getBrandLogo("trello.com") },
    { name: "Monday.com", logoUrl: getBrandLogo("monday.com") },
    { name: "Linear", logoUrl: getBrandLogo("linear.app") },
    { name: "ClickUp", logoUrl: getBrandLogo("clickup.com") },
    { name: "Discord", logoUrl: getBrandLogo("discord.com") },
    { name: "Zoom", logoUrl: getBrandLogo("zoom.us") },
    { name: "Google Calendar", logoUrl: getBrandLogo("calendar.google.com") },
    { name: "Gmail", logoUrl: getBrandLogo("gmail.com") },
    { name: "WhatsApp", logoUrl: getBrandLogo("whatsapp.com") },
    { name: "Telegram", logoUrl: getBrandLogo("telegram.org") },
    { name: "Calendly", logoUrl: getBrandLogo("calendly.com") },
    { name: "Miro", logoUrl: getBrandLogo("miro.com") }
];

// Row 3: AI/ML, Developer Tools, Databases, Cloud, Analytics
const row3Integrations: Integration[] = [
    { name: "OpenAI", logoUrl: getBrandLogo("openai.com") },
    { name: "Anthropic", logoUrl: getBrandLogo("anthropic.com") },
    { name: "Google AI", logoUrl: getBrandLogo("google.com") },
    { name: "GitHub", logoUrl: getBrandLogo("github.com") },
    { name: "GitLab", logoUrl: getBrandLogo("gitlab.com") },
    { name: "AWS", logoUrl: getBrandLogo("aws.amazon.com") },
    { name: "Google Cloud", logoUrl: getBrandLogo("cloud.google.com") },
    { name: "Azure", logoUrl: getBrandLogo("azure.microsoft.com") },
    { name: "MongoDB", logoUrl: getBrandLogo("mongodb.com") },
    { name: "PostgreSQL", logoUrl: getBrandLogo("postgrespro.com") },
    { name: "Snowflake", logoUrl: getBrandLogo("snowflake.com") },
    { name: "Vercel", logoUrl: getBrandLogo("vercel.com") },
    { name: "Datadog", logoUrl: getBrandLogo("datadoghq.com") },
    { name: "Mixpanel", logoUrl: getBrandLogo("mixpanel.com") },
    { name: "Segment", logoUrl: getBrandLogo("segment.com") },
    { name: "Figma", logoUrl: getBrandLogo("figma.com") },
    { name: "Hugging Face", logoUrl: getBrandLogo("huggingface.co") },
    { name: "Pinecone", logoUrl: getBrandLogo("pinecone.io") }
];

interface LogoRowProps {
    integrations: Integration[];
    direction: "left" | "right";
    speed?: number;
}

const LogoRow: React.FC<LogoRowProps> = ({ integrations, direction, speed = 30 }) => {
    // Duplicate the integrations to create a seamless loop
    const duplicatedIntegrations = [...integrations, ...integrations];

    return (
        <div className="relative flex overflow-hidden py-4">
            {/* Gradient masks for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            <div
                className={`flex items-center gap-12 ${
                    direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
                }`}
                style={{
                    animationDuration: `${speed}s`
                }}
            >
                {duplicatedIntegrations.map((integration, index) => (
                    <div
                        key={`${integration.name}-${index}`}
                        className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                    >
                        <img
                            src={integration.logoUrl}
                            alt={integration.name}
                            className="w-10 h-10 object-contain filter brightness-90 group-hover:brightness-110 transition-all"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Integrations: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const totalIntegrations = 110;

    return (
        <section
            ref={ref}
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-950 overflow-hidden"
        >
            {/* Background Decoration */}
            <div className="absolute inset-0 grid-pattern opacity-30"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-4"
                >
                    <p className="text-sm font-medium tracking-widest text-gray-400 uppercase mb-6">
                        Integrations
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Connect
                        <span className="gradient-text"> Everything</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        With {totalIntegrations}+ enterprise integrations, your AI agents can read,
                        write, and execute tasks within your existing systems.
                    </p>
                </motion.div>

                {/* Sliding Logo Rows */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-16 space-y-4"
                >
                    <LogoRow integrations={row1Integrations} direction="left" speed={40} />
                    <LogoRow integrations={row2Integrations} direction="right" speed={35} />
                    <LogoRow integrations={row3Integrations} direction="left" speed={38} />
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <Link
                        to="/integrations"
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all duration-200 inline-block"
                    >
                        View All Integrations
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};
