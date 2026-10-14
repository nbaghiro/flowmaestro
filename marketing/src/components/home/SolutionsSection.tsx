import React from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { useTileGlow } from "./Tile";

interface Team {
    name: string;
    text: string;
    href: string;
}

const TEAMS: Team[] = [
    { name: "Sales", text: "Enrich, qualify, route, follow up.", href: "/solutions/sales" },
    {
        name: "Marketing",
        text: "Content, campaigns, cross-platform analytics.",
        href: "/solutions/marketing"
    },
    { name: "Support", text: "Triage, answer, escalate with context.", href: "/solutions/support" },
    {
        name: "Engineering",
        text: "PR review, incident summaries, release notes.",
        href: "/solutions/engineering"
    },
    {
        name: "Operations",
        text: "Meeting prep, reporting, data sync.",
        href: "/solutions/operations"
    },
    {
        name: "Healthcare & Life Sciences",
        text: "Regulatory, payer policy, compliance research. PHI-free.",
        href: "/templates"
    }
];

const TeamTile: React.FC<Team> = ({ name, text, href }) => {
    const onMouseMove = useTileGlow();
    return (
        <Reveal className="span2">
            <Link to={href} className="tile" onMouseMove={onMouseMove}>
                <h3 className="text-[17px] font-semibold mb-1.5">{name}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
            </Link>
        </Reveal>
    );
};

export const SolutionsSection: React.FC = () => (
    <section id="solutions" className="sec">
        <div className="wrap">
            <Reveal>
                <h2 className="h2">Built for every team.</h2>
            </Reveal>
            <div className="bento mt-7">
                {TEAMS.map((team) => (
                    <TeamTile key={team.name} {...team} />
                ))}
            </div>
        </div>
    </section>
);
