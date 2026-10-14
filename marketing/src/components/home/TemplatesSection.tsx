import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import type { Template } from "@flowmaestro/shared";
import { getTemplates } from "../../lib/api";
import { Reveal } from "./Reveal";
import { TemplateMap } from "./TemplateMap";
import { useTileGlow } from "./Tile";
import type { MapDefinition } from "./TemplateMap";

interface FeaturedTemplate {
    category: string;
    name: string;
    definition?: MapDefinition;
    nodeCount: number;
    integrations: string[];
}

// One featured template per team, in this order, so the row reads as a tour rather than a list
const CATEGORY_ORDER = ["sales", "engineering", "support", "marketing", "operations", "healthcare"];

// Shown while the snapshot loads and whenever it cannot be read
const FALLBACK: FeaturedTemplate[] = [
    { category: "SALES", name: "Lead Enrichment Pipeline", nodeCount: 0, integrations: [] },
    { category: "ENGINEERING", name: "GitHub PR Reviewer", nodeCount: 0, integrations: [] },
    { category: "SUPPORT", name: "WhatsApp Customer Support Bot", nodeCount: 0, integrations: [] },
    { category: "MARKETING", name: "Social Media Performance Hub", nodeCount: 0, integrations: [] },
    { category: "OPERATIONS", name: "Calendly Meeting Prep", nodeCount: 0, integrations: [] },
    {
        category: "HEALTHCARE",
        name: "Weekly Healthcare Regulatory Digest",
        nodeCount: 0,
        integrations: []
    }
];

function countNodes(definition: MapDefinition | undefined): number {
    if (!definition?.nodes) return 0;
    const nodes = Array.isArray(definition.nodes)
        ? definition.nodes
        : Object.values(definition.nodes);
    return nodes.filter((node) => node.type !== "comment").length;
}

function pickFeatured(templates: Template[]): FeaturedTemplate[] {
    const picked: FeaturedTemplate[] = [];
    const used = new Set<string>();
    const take = (template: Template): void => {
        used.add(template.id);
        const definition = template.definition as unknown as MapDefinition;
        picked.push({
            category: (
                TEMPLATE_CATEGORY_META[template.category]?.label ?? template.category
            ).toUpperCase(),
            name: template.name,
            definition,
            nodeCount: countNodes(definition),
            integrations: template.required_integrations ?? []
        });
    };
    for (const category of CATEGORY_ORDER) {
        const match = templates.find((t) => t.category === category && !used.has(t.id));
        if (match) take(match);
    }
    for (const template of templates) {
        if (picked.length >= 6) break;
        if (!used.has(template.id)) take(template);
    }
    return picked.slice(0, 6);
}

const TemplateTile: React.FC<FeaturedTemplate & { delay: number }> = ({
    category,
    name,
    definition,
    nodeCount,
    integrations,
    delay
}) => {
    const onMouseMove = useTileGlow();
    const meta = [
        nodeCount > 0 ? `${nodeCount} nodes` : null,
        integrations.length > 0 ? integrations.slice(0, 3).join(" · ") : null
    ].filter(Boolean);
    return (
        <Reveal className="span2">
            <Link to="/templates" className="tile flex flex-col gap-3" onMouseMove={onMouseMove}>
                <div>
                    <p className="font-mono text-[11px] text-dim mb-[6px]">{category}</p>
                    <p className="font-semibold leading-snug">{name}</p>
                </div>
                <div className="stage dotgrid mt-auto" style={{ padding: 6 }}>
                    {definition ? (
                        <TemplateMap definition={definition} delay={delay} />
                    ) : (
                        <div style={{ aspectRatio: "320 / 118" }} />
                    )}
                </div>
                {meta.length > 0 && (
                    <div className="foot">
                        {meta.map((text) => (
                            <span key={text}>{text}</span>
                        ))}
                    </div>
                )}
            </Link>
        </Reveal>
    );
};

/** Six featured templates, each with a map of its real graph, and a link to the gallery. */
export const TemplatesSection: React.FC = () => {
    const featured = useQuery({
        queryKey: ["home", "featured-templates"],
        queryFn: () => getTemplates({ featured: true, limit: 60 }),
        staleTime: 60 * 60 * 1000,
        retry: 0
    });

    const items: FeaturedTemplate[] =
        featured.data?.data?.items && featured.data.data.items.length >= 6
            ? pickFeatured(featured.data.data.items)
            : FALLBACK;

    return (
        <section id="templates" className="sec scroll-mt-20">
            <div className="wrap">
                <Reveal>
                    <h2 className="h2">Start from a template.</h2>
                </Reveal>
                <Reveal>
                    <p className="lead">
                        193 workflow templates, 104 agent templates and 38 personas, all validated
                        to run.
                    </p>
                </Reveal>
                <div className="bento">
                    {items.map((item, index) => (
                        <TemplateTile key={item.name} {...item} delay={index * 0.9} />
                    ))}
                </div>
                <Reveal className="text-center mt-5">
                    <Link
                        to="/templates"
                        className="btn btn-ghost"
                        style={{ height: 40, fontSize: 14 }}
                    >
                        Browse all templates
                    </Link>
                </Reveal>
            </div>
        </section>
    );
};
