import { FileText } from "lucide-react";
import type { AgentTemplate, Template } from "@flowmaestro/shared";
import { AgentTemplateCard } from "../templates/cards/AgentTemplateCard";
import { TemplateCard } from "../templates/cards/TemplateCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

type MixedTemplate =
    | { type: "workflow"; template: Template }
    | { type: "agent"; template: AgentTemplate };

interface MixedTemplatesProps {
    templates: MixedTemplate[];
    onWorkflowTemplateClick: (template: Template) => void;
    onAgentTemplateClick: (template: AgentTemplate) => void;
}

export function MixedTemplates({
    templates,
    onWorkflowTemplateClick,
    onAgentTemplateClick
}: MixedTemplatesProps) {
    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Browse templates to quickly create workflows and agents.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Templates"
            viewAllLink="/templates"
            viewAllText="Browse templates"
            isEmpty={templates.length === 0}
            emptyState={emptyState}
        >
            {templates.map((item, index) => (
                <div
                    key={`${item.type}-${item.template.id}-${index}`}
                    className="flex-shrink-0 w-[280px]"
                >
                    {item.type === "workflow" ? (
                        <TemplateCard template={item.template} onClick={onWorkflowTemplateClick} />
                    ) : (
                        <AgentTemplateCard
                            template={item.template}
                            onClick={onAgentTemplateClick}
                        />
                    )}
                </div>
            ))}
        </HorizontalCardRow>
    );
}
