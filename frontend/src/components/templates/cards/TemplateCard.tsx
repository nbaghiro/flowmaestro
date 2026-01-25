import { Eye, Copy } from "lucide-react";
import {
    ALL_PROVIDERS,
    getProviderLogo,
    TEMPLATE_CATEGORY_META,
    type Template
} from "@flowmaestro/shared";
import { cn } from "../../../lib/utils";
import { WorkflowCanvasPreview, type WorkflowDefinition } from "../../common/WorkflowCanvasPreview";

interface TemplateCardProps {
    template: Template;
    onClick: (template: Template) => void;
}

// Get logo URL for an integration - uses shared providers or Brandfetch fallback
const getIntegrationLogo = (integration: string): string => {
    // First check if it's in ALL_PROVIDERS
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    // Fallback: use shared getProviderLogo which handles domain mapping
    return getProviderLogo(integration);
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
    const category = TEMPLATE_CATEGORY_META[template.category];

    if (!category) return null;

    return (
        <div
            onClick={() => onClick(template)}
            className={cn(
                "bg-card dark:bg-card rounded-xl border border-border dark:border-border",
                "hover:shadow-xl hover:border-border/60 dark:hover:border-border/60 hover:scale-[1.02]",
                "transition-all duration-200 cursor-pointer overflow-hidden group"
            )}
        >
            {/* React Flow Preview */}
            <div className="h-40 relative overflow-hidden">
                <WorkflowCanvasPreview
                    definition={template.definition as WorkflowDefinition}
                    height="h-full"
                    className="!shadow-none"
                />
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3 z-10">
                    <span
                        className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                            category.color
                        )}
                    >
                        {category.label}
                    </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors pointer-events-none" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with integrations and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {template.required_integrations.map((integration) => (
                            <img
                                key={integration}
                                src={getIntegrationLogo(integration)}
                                alt={integration}
                                title={integration}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {template.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {template.use_count}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground dark:text-foreground line-clamp-1 mb-1.5">
                    {template.name}
                </h3>

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2">
                        {template.description}
                    </p>
                )}
            </div>
        </div>
    );
}
