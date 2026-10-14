import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import { getTemplates } from "../../lib/api";
import { Reveal } from "./Reveal";
import { useTileGlow } from "./Tile";

interface FeaturedTemplate {
    category: string;
    name: string;
}

// Seeded featured templates, shown until the API answers and whenever it cannot be reached.
const FALLBACK: FeaturedTemplate[] = [
    { category: "SALES", name: "Lead Enrichment Pipeline" },
    { category: "ENGINEERING", name: "GitHub PR Reviewer" },
    { category: "SUPPORT", name: "WhatsApp Customer Support Bot" },
    { category: "MARKETING", name: "Social Media Performance Hub" },
    { category: "OPERATIONS", name: "Calendly Meeting Prep" },
    { category: "HEALTHCARE", name: "Weekly Healthcare Regulatory Digest" }
];

const TemplateTile: React.FC<FeaturedTemplate> = ({ category, name }) => {
    const onMouseMove = useTileGlow();
    return (
        <Reveal className="span2">
            <Link to="/templates" className="tile" onMouseMove={onMouseMove}>
                <p className="font-mono text-[11px] text-dim mb-[10px]">{category}</p>
                <p className="font-semibold">{name}</p>
            </Link>
        </Reveal>
    );
};

/** Six featured templates, with a link to the full gallery. */
export const TemplatesSection: React.FC = () => {
    const featured = useQuery({
        queryKey: ["home", "featured-templates"],
        queryFn: () => getTemplates({ featured: true, limit: 6 }),
        staleTime: 60 * 60 * 1000,
        retry: 0
    });

    const items: FeaturedTemplate[] =
        featured.data?.data?.items && featured.data.data.items.length >= 6
            ? featured.data.data.items.slice(0, 6).map((template) => ({
                  category: (
                      TEMPLATE_CATEGORY_META[template.category]?.label ?? template.category
                  ).toUpperCase(),
                  name: template.name
              }))
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
                    {items.map((item) => (
                        <TemplateTile key={item.name} {...item} />
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
