import { GitBranch, BookOpen, Code } from "lucide-react";
import { ALL_PROVIDERS, getProviderLogo } from "@flowmaestro/shared";
import { extractToolIconsFromAgent } from "../../lib/agentUtils";
import { Tooltip } from "./Tooltip";
import type { Tool } from "../../lib/api";

interface AgentToolIconListProps {
    tools: Tool[];
    maxVisible?: number;
    iconSize?: "sm" | "md";
    className?: string;
}

/**
 * Get logo URL for a provider.
 * First checks ALL_PROVIDERS for a defined logoUrl, then falls back to Brandfetch.
 */
function getIntegrationLogo(providerId: string): string {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    if (provider?.logoUrl) {
        return provider.logoUrl;
    }
    return getProviderLogo(providerId);
}

/**
 * Get display name for a provider.
 */
function getProviderDisplayName(providerId: string): string {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    return provider?.displayName || providerId;
}

/**
 * Icon item for rendering
 */
interface IconItem {
    type: "mcp" | "workflow" | "knowledge_base" | "function";
    provider?: string;
    count?: number;
}

/**
 * Displays a row of tool icons for an agent.
 * Shows MCP provider icons (deduplicated), workflow icons, knowledge base icons, and function icons.
 * Shows up to maxVisible icons, with a "+X" badge for overflow.
 */
export function AgentToolIconList({
    tools,
    maxVisible = 5,
    iconSize = "sm",
    className = ""
}: AgentToolIconListProps) {
    const extracted = extractToolIconsFromAgent(tools);

    // Build the list of icons to display
    const iconItems: IconItem[] = [];

    // Add MCP provider icons first
    for (const provider of extracted.mcpProviders) {
        iconItems.push({ type: "mcp", provider });
    }

    // Add workflow icon if there are workflows
    if (extracted.workflowCount > 0) {
        iconItems.push({ type: "workflow", count: extracted.workflowCount });
    }

    // Add knowledge base icon if there are knowledge bases
    if (extracted.knowledgeBaseCount > 0) {
        iconItems.push({ type: "knowledge_base", count: extracted.knowledgeBaseCount });
    }

    // Add function icon if there are functions
    if (extracted.functionCount > 0) {
        iconItems.push({ type: "function", count: extracted.functionCount });
    }

    // Return null if no tools
    if (iconItems.length === 0) {
        return null;
    }

    const visibleItems = iconItems.slice(0, maxVisible);
    const overflowCount = iconItems.length - maxVisible;
    const overflowItems = iconItems.slice(maxVisible);

    const sizeClasses = iconSize === "sm" ? "w-4 h-4" : "w-5 h-5";

    /**
     * Get tooltip content for an icon item
     */
    const getTooltipContent = (item: IconItem): string => {
        switch (item.type) {
            case "mcp":
                return getProviderDisplayName(item.provider || "");
            case "workflow":
                return `${item.count} workflow${item.count !== 1 ? "s" : ""}`;
            case "knowledge_base":
                return `${item.count} knowledge base${item.count !== 1 ? "s" : ""}`;
            case "function":
                return `${item.count} function${item.count !== 1 ? "s" : ""}`;
        }
    };

    /**
     * Get overflow tooltip content
     */
    const getOverflowTooltip = (): string => {
        return overflowItems.map((item) => getTooltipContent(item)).join(", ");
    };

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {visibleItems.map((item, index) => {
                if (item.type === "mcp" && item.provider) {
                    return (
                        <Tooltip key={`mcp-${item.provider}`} content={getTooltipContent(item)}>
                            <img
                                src={getIntegrationLogo(item.provider)}
                                alt={item.provider}
                                className={`${sizeClasses} object-contain rounded-sm`}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </Tooltip>
                    );
                }

                if (item.type === "workflow") {
                    return (
                        <Tooltip key="workflow" content={getTooltipContent(item)}>
                            <div className="flex items-center justify-center bg-muted rounded-sm p-0.5">
                                <GitBranch className={`${sizeClasses} text-muted-foreground`} />
                            </div>
                        </Tooltip>
                    );
                }

                if (item.type === "knowledge_base") {
                    return (
                        <Tooltip key="knowledge_base" content={getTooltipContent(item)}>
                            <div className="flex items-center justify-center bg-muted rounded-sm p-0.5">
                                <BookOpen className={`${sizeClasses} text-muted-foreground`} />
                            </div>
                        </Tooltip>
                    );
                }

                if (item.type === "function") {
                    return (
                        <Tooltip key={`function-${index}`} content={getTooltipContent(item)}>
                            <div className="flex items-center justify-center bg-muted rounded-sm p-0.5">
                                <Code className={`${sizeClasses} text-muted-foreground`} />
                            </div>
                        </Tooltip>
                    );
                }

                return null;
            })}
            {overflowCount > 0 && (
                <Tooltip content={getOverflowTooltip()}>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                        +{overflowCount}
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
