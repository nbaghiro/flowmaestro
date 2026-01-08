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
    type LucideIcon
} from "lucide-react";
import { type AgentPattern, getAllAgentPatterns } from "../lib/agentPatterns";
import { cn } from "../lib/utils";
import { Badge } from "./common/Badge";

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
    UserPlus
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
                "bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group",
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
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {pattern.description}
                </p>
            </div>

            {/* System Prompt Preview */}
            <div className="px-4 pb-3">
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {promptPreview}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
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
            </div>
        </div>
    );
}

export function AgentPatternPicker({ selectedPatternId, onSelect }: AgentPatternPickerProps) {
    const patterns = getAllAgentPatterns();

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                    Choose a starting point
                </h3>
                <p className="text-sm text-muted-foreground">
                    Select a pattern to start with, or create a blank agent
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[70vh] overflow-y-scroll pr-2">
                {patterns.map((pattern) => (
                    <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        isSelected={selectedPatternId === pattern.id}
                        onClick={() => onSelect(pattern)}
                    />
                ))}
            </div>
        </div>
    );
}
