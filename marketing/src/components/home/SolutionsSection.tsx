import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { getTemplateCategories } from "../../lib/api";
import { Reveal } from "./Reveal";
import { ProviderLogo } from "./TemplateRecipe";
import { useTileGlow } from "./Tile";

interface Team {
    name: string;
    text: string;
    href: string;
    /** Template category whose count is shown in the footer. */
    category: string;
    /** The apps the team's templates lean on. */
    apps: Array<{ name: string; domain: string }>;
}

const TEAMS: Team[] = [
    {
        name: "Sales",
        text: "Enrich, qualify, route, follow up.",
        href: "/solutions/sales",
        category: "sales",
        apps: [
            { name: "HubSpot", domain: "hubspot.com" },
            { name: "Salesforce", domain: "salesforce.com" },
            { name: "Apollo", domain: "apollo.io" },
            { name: "Slack", domain: "slack.com" }
        ]
    },
    {
        name: "Marketing",
        text: "Content, campaigns, cross-platform analytics.",
        href: "/solutions/marketing",
        category: "marketing",
        apps: [
            { name: "LinkedIn", domain: "linkedin.com" },
            { name: "X", domain: "x.com" },
            { name: "Instagram", domain: "instagram.com" },
            { name: "Notion", domain: "notion.so" }
        ]
    },
    {
        name: "Support",
        text: "Triage, answer, escalate with context.",
        href: "/solutions/support",
        category: "support",
        apps: [
            { name: "Zendesk", domain: "zendesk.com" },
            { name: "Intercom", domain: "intercom.com" },
            { name: "Gmail", domain: "gmail.com" },
            { name: "Slack", domain: "slack.com" }
        ]
    },
    {
        name: "Engineering",
        text: "PR review, incident summaries, release notes.",
        href: "/solutions/engineering",
        category: "engineering",
        apps: [
            { name: "GitHub", domain: "github.com" },
            { name: "Linear", domain: "linear.app" },
            { name: "Datadog", domain: "datadoghq.com" },
            { name: "Slack", domain: "slack.com" }
        ]
    },
    {
        name: "Operations",
        text: "Meeting prep, reporting, data sync.",
        href: "/solutions/operations",
        category: "operations",
        apps: [
            { name: "Google Calendar", domain: "google.com" },
            { name: "Asana", domain: "asana.com" },
            { name: "Airtable", domain: "airtable.com" },
            { name: "Slack", domain: "slack.com" }
        ]
    },
    {
        name: "Healthcare & Life Sciences",
        text: "Regulatory, payer policy, compliance research. PHI-free.",
        href: "/templates",
        category: "healthcare",
        apps: [
            { name: "Gmail", domain: "gmail.com" },
            { name: "Notion", domain: "notion.so" },
            { name: "DocuSign", domain: "docusign.com" },
            { name: "Slack", domain: "slack.com" }
        ]
    }
];

const TeamTile: React.FC<Team & { count?: number }> = ({ name, text, href, apps, count }) => {
    const onMouseMove = useTileGlow();
    return (
        <Reveal className="span2">
            <Link to={href} className="tile flex flex-col gap-3" onMouseMove={onMouseMove}>
                <div>
                    <h3 className="text-[17px] font-semibold mb-1">{name}</h3>
                    <p className="text-sm text-muted-foreground">{text}</p>
                </div>
                <div className="mt-auto flex gap-2">
                    {apps.map((app) => (
                        <ProviderLogo key={app.domain} domain={app.domain} name={app.name} />
                    ))}
                </div>
                <div className="foot">
                    <span>{count !== undefined ? `${count} templates` : "templates"}</span>
                    <span>see how →</span>
                </div>
            </Link>
        </Reveal>
    );
};

/** One tile per team, each running the team's typical pipeline. */
export const SolutionsSection: React.FC = () => {
    const categories = useQuery({
        queryKey: ["home", "template-categories"],
        queryFn: getTemplateCategories,
        staleTime: 60 * 60 * 1000,
        retry: 0
    });
    const counts = new Map(
        (categories.data?.data ?? []).map((info) => [info.category as string, info.count])
    );

    return (
        <section id="solutions" className="sec">
            <div className="wrap">
                <Reveal>
                    <h2 className="h2">Built for every team.</h2>
                </Reveal>
                <div className="bento mt-7">
                    {TEAMS.map((team) => (
                        <TeamTile key={team.name} {...team} count={counts.get(team.category)} />
                    ))}
                </div>
            </div>
        </section>
    );
};
