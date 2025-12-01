import { Eye, Copy, Bot, Wrench } from "lucide-react";
import { ALL_PROVIDERS, TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import type { AgentTemplate } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

interface AgentTemplateCardProps {
    template: AgentTemplate;
    onClick: (template: AgentTemplate) => void;
}

// Brandfetch Logo API
const BRANDFETCH_CLIENT_ID = "1idCpJZqz6etuVweFEJ";
const getBrandLogo = (domain: string): string =>
    `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

// Domain mapping for providers
const providerDomains: Record<string, string> = {
    google_sheets: "google.com",
    google_calendar: "google.com",
    gmail: "gmail.com",
    microsoft_teams: "microsoft.com",
    hubspot: "hubspot.com"
};

// Get logo URL for an integration
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    if (providerDomains[integration]) {
        return getBrandLogo(providerDomains[integration]);
    }
    return getBrandLogo(`${integration}.com`);
};

// Provider logos for the AI provider
const providerLogos: Record<string, string> = {
    openai: "https://cdn.brandfetch.io/openai.com?c=" + BRANDFETCH_CLIENT_ID,
    anthropic: "https://cdn.brandfetch.io/anthropic.com?c=" + BRANDFETCH_CLIENT_ID,
    google: "https://cdn.brandfetch.io/google.com?c=" + BRANDFETCH_CLIENT_ID,
    cohere: "https://cdn.brandfetch.io/cohere.com?c=" + BRANDFETCH_CLIENT_ID
};

export function AgentTemplateCard({ template, onClick }: AgentTemplateCardProps) {
    const category = TEMPLATE_CATEGORY_META[template.category];

    if (!category) return null;

    // Get unique tool providers for display
    const toolProviders = template.available_tools
        .filter((tool) => tool.provider)
        .map((tool) => tool.provider!)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, 4);

    // Truncate system prompt for preview
    const promptPreview = template.system_prompt.split("\n").slice(0, 3).join("\n").slice(0, 150);

    return (
        <div
            onClick={() => onClick(template)}
            className={cn(
                "bg-card dark:bg-card rounded-xl border border-border dark:border-border",
                "hover:shadow-xl hover:border-border/60 dark:hover:border-border/60 hover:scale-[1.02]",
                "transition-all duration-200 cursor-pointer overflow-hidden group"
            )}
        >
            {/* Agent Preview Area */}
            <div className="h-40 bg-muted/30 dark:bg-muted relative overflow-hidden">
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

                {/* Model badge */}
                <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-card/90 dark:bg-card/90 text-gray-600 dark:text-gray-300 backdrop-blur-sm">
                        {template.model}
                    </span>
                </div>

                {/* System prompt preview */}
                <div className="absolute inset-0 p-4 pt-12 pb-16">
                    <div className="text-xs text-gray-600 dark:text-muted-foreground font-mono leading-relaxed line-clamp-4">
                        {promptPreview}...
                    </div>
                </div>

                {/* AI Bot icon */}
                <div className="absolute bottom-3 right-3 z-10">
                    <div className="w-10 h-10 rounded-full bg-card dark:bg-card shadow-lg flex items-center justify-center">
                        {template.provider && providerLogos[template.provider] ? (
                            <img
                                src={providerLogos[template.provider]}
                                alt={template.provider}
                                className="w-6 h-6 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                    (
                                        e.target as HTMLImageElement
                                    ).nextElementSibling?.classList.remove("hidden");
                                }}
                            />
                        ) : (
                            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors pointer-events-none" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with tools and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {toolProviders.length > 0 ? (
                            toolProviders.map((provider) => (
                                <img
                                    key={provider}
                                    src={getIntegrationLogo(provider)}
                                    alt={provider}
                                    title={provider}
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ))
                        ) : template.available_tools.length > 0 ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                                <Wrench className="w-4 h-4" />
                                <span>{template.available_tools.length} tools</span>
                            </div>
                        ) : null}
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
