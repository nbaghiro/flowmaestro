import { useQuery } from "@tanstack/react-query";
import React from "react";
import type { CategoryInfo } from "@flowmaestro/shared";
import { getAgentTemplateCategories, getTemplateCategories } from "../../lib/api";
import { Reveal } from "./Reveal";

// Seeded counts, shown until the API answers and whenever it cannot be reached.
const FALLBACK = { workflows: 193, agents: 104, personas: 38 };

function total(categories: CategoryInfo[] | undefined): number {
    return categories?.reduce((sum, category) => sum + category.count, 0) ?? 0;
}

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <span className="font-mono text-[13px] tracking-[0.02em]">
        <b className="text-foreground font-semibold">{value}</b> {label}
    </span>
);

const Separator: React.FC = () => (
    <span className="text-border" aria-hidden="true">
        ·
    </span>
);

/** Template, persona and integration counts under the hero. */
export const StatsStrip: React.FC = () => {
    const workflows = useQuery({
        queryKey: ["home", "workflow-template-categories"],
        queryFn: getTemplateCategories,
        staleTime: 60 * 60 * 1000,
        retry: 0
    });
    const agents = useQuery({
        queryKey: ["home", "agent-template-categories"],
        queryFn: getAgentTemplateCategories,
        staleTime: 60 * 60 * 1000,
        retry: 0
    });

    const workflowCount = total(workflows.data?.data) || FALLBACK.workflows;
    const agentCount = total(agents.data?.data) || FALLBACK.agents;

    return (
        <section className="sec" style={{ paddingTop: 8 }}>
            <Reveal className="wrap flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-dim text-sm">
                <Stat value={String(workflowCount)} label="workflow templates" />
                <Separator />
                <Stat value={String(agentCount)} label="agent templates" />
                <Separator />
                <Stat value={String(FALLBACK.personas)} label="personas" />
                <Separator />
                <Stat value="110+" label="integrations" />
            </Reveal>
        </section>
    );
};
