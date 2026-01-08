import {
    Plus,
    Bot,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus,
    CheckCircle,
    Database,
    Workflow,
    Plug,
    GitBranch,
    AlertTriangle,
    FileText,
    HeartHandshake,
    type LucideIcon
} from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "./common/Badge";
import type { AgentPattern } from "../lib/agentPatterns";

// Icon mapping for patterns
const iconMap: Record<string, LucideIcon> = {
    Plus,
    Bot,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus,
    GitBranch,
    AlertTriangle,
    FileText,
    HeartHandshake
};

// Icon mapping for tool suggestions
const toolIconMap: Record<string, LucideIcon> = {
    knowledge_base: Database,
    workflow: Workflow,
    mcp: Plug
};

// Category colors
const categoryColors: Record<string, { bg: string; text: string }> = {
    general: { bg: "bg-blue-500/10", text: "text-blue-500" },
    technical: { bg: "bg-purple-500/10", text: "text-purple-500" },
    business: { bg: "bg-green-500/10", text: "text-green-500" },
    creative: { bg: "bg-orange-500/10", text: "text-orange-500" }
};

interface AgentPatternPickerProps {
    patterns: AgentPattern[];
    selectedPatternId: string | null;
    onSelect: (pattern: AgentPattern) => void;
}

interface PatternCardProps {
    pattern: AgentPattern;
    isSelected: boolean;
    onClick: () => void;
}

function PatternCard({ pattern, isSelected, onClick }: PatternCardProps) {
    const Icon = iconMap[pattern.icon] || Bot;
    const categoryColor = categoryColors[pattern.category] || categoryColors.general;

    // Get first 3 lines of system prompt for preview
    const promptPreview = pattern.systemPrompt
        .split("\n")
        .filter((line) => line.trim())
        .slice(0, 3)
        .join("\n");

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col h-full",
                isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border hover:border-border/60 hover:shadow-md"
            )}
        >
            {/* Header */}
            <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-primary/10" : "bg-muted"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-4 h-4",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                )}
                            />
                        </div>
                        <h3 className="font-semibold text-foreground">{pattern.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="default"
                            size="sm"
                            className={cn(categoryColor.bg, categoryColor.text, "border-0")}
                        >
                            {pattern.category}
                        </Badge>
                        {isSelected && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">{pattern.description}</p>
            </div>

            {/* System Prompt Preview */}
            <div className="px-4 pb-3 flex-grow">
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {promptPreview}
                    </p>
                </div>
            </div>

            {/* Footer - always at bottom */}
            <div className="px-4 pb-4 mt-auto">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {/* Suggested Tools */}
                    <div className="flex items-center gap-2">
                        {pattern.suggestedTools.length > 0 ? (
                            pattern.suggestedTools.map((tool, index) => {
                                const ToolIcon = toolIconMap[tool.type] || Plug;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full"
                                        title={tool.label}
                                    >
                                        <ToolIcon className="w-3 h-3" />
                                        <span className="text-xs">{tool.label}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <span className="text-muted-foreground/60">No tools suggested</span>
                        )}
                    </div>

                    {/* Use Case */}
                    <span>{pattern.useCase}</span>
                </div>

                {/* MCP Tool Badges for Advanced Patterns */}
                {pattern.mcpTools && pattern.mcpTools.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">Integrations:</span>
                        {pattern.mcpTools.map((tool) => (
                            <span
                                key={tool.provider}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full"
                                title={tool.description}
                            >
                                {tool.provider}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AgentPatternPicker({
    patterns,
    selectedPatternId,
    onSelect
}: AgentPatternPickerProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {patterns.map((pattern) => (
                <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    isSelected={selectedPatternId === pattern.id}
                    onClick={() => onSelect(pattern)}
                />
            ))}
        </div>
    );
}
