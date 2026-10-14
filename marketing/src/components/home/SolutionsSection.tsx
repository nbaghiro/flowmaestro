import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { getTemplateCategories } from "../../lib/api";
import { MiniPipeline } from "./MiniPipeline";
import { Reveal } from "./Reveal";
import { useTileGlow } from "./Tile";
import type { PipelineStep } from "./MiniPipeline";

interface Team {
    name: string;
    text: string;
    href: string;
    /** Template category whose count is shown in the footer. */
    category: string;
    steps: PipelineStep[];
}

const TEAMS: Team[] = [
    {
        name: "Sales",
        text: "Enrich, qualify, route, follow up.",
        href: "/solutions/sales",
        category: "sales",
        steps: [
            { k: "TRIGGER", v: "New lead" },
            { k: "AGENT", v: "Enrich + qualify" },
            { k: "ACTION · HUBSPOT", v: "Route to rep" }
        ]
    },
    {
        name: "Marketing",
        text: "Content, campaigns, cross-platform analytics.",
        href: "/solutions/marketing",
        category: "marketing",
        steps: [
            { k: "INPUT", v: "Campaign brief" },
            { k: "AGENT", v: "Draft the posts" },
            { k: "ACTION · LINKEDIN", v: "Publish" }
        ]
    },
    {
        name: "Support",
        text: "Triage, answer, escalate with context.",
        href: "/solutions/support",
        category: "support",
        steps: [
            { k: "TRIGGER · ZENDESK", v: "New ticket" },
            { k: "KNOWLEDGE", v: "Find the answer" },
            { k: "CONDITION", v: "Escalate?" }
        ]
    },
    {
        name: "Engineering",
        text: "PR review, incident summaries, release notes.",
        href: "/solutions/engineering",
        category: "engineering",
        steps: [
            { k: "TRIGGER · GITHUB", v: "PR opened" },
            { k: "AGENT", v: "Review the diff" },
            { k: "ACTION · SLACK", v: "Post summary" }
        ]
    },
    {
        name: "Operations",
        text: "Meeting prep, reporting, data sync.",
        href: "/solutions/operations",
        category: "operations",
        steps: [
            { k: "SCHEDULE", v: "Mon 08:00" },
            { k: "INTEGRATION · CALENDAR", v: "Pull meetings" },
            { k: "AGENT", v: "Prep the notes" }
        ]
    },
    {
        name: "Healthcare & Life Sciences",
        text: "Regulatory, payer policy, compliance research. PHI-free.",
        href: "/templates",
        category: "healthcare",
        steps: [
            { k: "SCHEDULE", v: "Weekly" },
            { k: "AGENT", v: "Regulatory digest" },
            { k: "ACTION · EMAIL", v: "Send to team" }
        ]
    }
];

const TeamTile: React.FC<Team & { count?: number; delay: number }> = ({
    name,
    text,
    href,
    steps,
    count,
    delay
}) => {
    const onMouseMove = useTileGlow();
    return (
        <Reveal className="span2">
            <Link to={href} className="tile flex flex-col gap-3" onMouseMove={onMouseMove}>
                <div>
                    <h3 className="text-[17px] font-semibold mb-1">{name}</h3>
                    <p className="text-sm text-muted-foreground">{text}</p>
                </div>
                <div className="mt-auto">
                    <MiniPipeline steps={steps} delay={delay} />
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
                    {TEAMS.map((team, index) => (
                        <TeamTile
                            key={team.name}
                            {...team}
                            count={counts.get(team.category)}
                            delay={index * 0.9}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
