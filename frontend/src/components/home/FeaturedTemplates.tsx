import type { Template } from "@flowmaestro/shared";
import { TemplateCard } from "../templates/cards/TemplateCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

interface FeaturedTemplatesProps {
    templates: Template[];
    onTemplateClick: (template: Template) => void;
}

export function FeaturedTemplates({ templates, onTemplateClick }: FeaturedTemplatesProps) {
    if (templates.length === 0) {
        return null; // Don't show section if no templates
    }

    return (
        <HorizontalCardRow
            title="Featured Templates"
            viewAllLink="/templates"
            viewAllText="Browse templates"
        >
            {templates.map((template) => (
                <div key={template.id} className="flex-shrink-0 w-[280px]">
                    <TemplateCard template={template} onClick={onTemplateClick} />
                </div>
            ))}
        </HorizontalCardRow>
    );
}
