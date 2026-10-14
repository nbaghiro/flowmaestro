import { useInView } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getProviderLogoUrl } from "@flowmaestro/shared";
import { HomePageEvents } from "../../lib/analytics";
import { Reveal } from "./Reveal";

interface Logo {
    name: string;
    domain: string;
}

const ROW_ONE: Logo[] = [
    { name: "Salesforce", domain: "salesforce.com" },
    { name: "HubSpot", domain: "hubspot.com" },
    { name: "Shopify", domain: "shopify.com" },
    { name: "Stripe", domain: "stripe.com" },
    { name: "Mailchimp", domain: "mailchimp.com" },
    { name: "Apollo.io", domain: "apollo.io" },
    { name: "Pipedrive", domain: "pipedrive.com" },
    { name: "Klaviyo", domain: "klaviyo.com" },
    { name: "Zendesk", domain: "zendesk.com" },
    { name: "Intercom", domain: "intercom.com" },
    { name: "PayPal", domain: "paypal.com" },
    { name: "QuickBooks", domain: "quickbooks.intuit.com" },
    { name: "Xero", domain: "xero.com" },
    { name: "DocuSign", domain: "docusign.com" },
    { name: "Snowflake", domain: "snowflake.com" }
];

const ROW_TWO: Logo[] = [
    { name: "Slack", domain: "slack.com" },
    { name: "Microsoft Teams", domain: "teams.microsoft.com" },
    { name: "Gmail", domain: "gmail.com" },
    { name: "Notion", domain: "notion.so" },
    { name: "Airtable", domain: "airtable.com" },
    { name: "GitHub", domain: "github.com" },
    { name: "Linear", domain: "linear.app" },
    { name: "Jira", domain: "atlassian.com" },
    { name: "Zoom", domain: "zoom.us" },
    { name: "Discord", domain: "discord.com" },
    { name: "Asana", domain: "asana.com" },
    { name: "Trello", domain: "trello.com" },
    { name: "OpenAI", domain: "openai.com" },
    { name: "Anthropic", domain: "anthropic.com" },
    { name: "PostgreSQL", domain: "postgresql.org" }
];

const LogoRow: React.FC<{ logos: Logo[]; reverse?: boolean }> = ({ logos, reverse }) => (
    <div
        className={reverse ? "marquee rev" : "marquee"}
        style={reverse ? { marginTop: 16 } : undefined}
        aria-hidden="true"
    >
        {[...logos, ...logos].map((logo, index) => (
            <span key={`${logo.domain}-${index}`} className="logo" title={logo.name}>
                <img
                    src={getProviderLogoUrl(logo.domain)}
                    alt=""
                    loading="eager"
                    onError={(event) => {
                        event.currentTarget.style.display = "none";
                    }}
                />
            </span>
        ))}
    </div>
);

/** Two rows of integration logos rolling in opposite directions. */
export const IntegrationsRoll: React.FC = () => {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const tracked = useRef(false);

    useEffect(() => {
        if (inView && !tracked.current) {
            HomePageEvents.integrationsSectionViewed();
            tracked.current = true;
        }
    }, [inView]);

    return (
        <section id="integrations" ref={ref} className="sec overflow-hidden scroll-mt-20">
            <Reveal>
                <h2 className="h2">110+ integrations.</h2>
            </Reveal>
            <Reveal>
                <p className="lead">
                    CRM, support, commerce, payments, finance, communication, developer tools, and
                    MCP servers for agents.
                </p>
            </Reveal>
            <div className="wrap">
                <Reveal className="roll">
                    <LogoRow logos={ROW_ONE} />
                    <LogoRow logos={ROW_TWO} reverse />
                </Reveal>
                <Reveal className="text-center mt-7">
                    <Link
                        to="/integrations"
                        className="btn btn-ghost"
                        style={{ height: 40, fontSize: 14 }}
                    >
                        Browse all integrations
                    </Link>
                </Reveal>
            </div>
        </section>
    );
};
