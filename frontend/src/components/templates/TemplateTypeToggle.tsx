import { GitBranch, Bot } from "lucide-react";
import { cn } from "../../lib/utils";

export type TemplateType = "workflows" | "agents";

interface TemplateTypeToggleProps {
    value: TemplateType;
    onChange: (value: TemplateType) => void;
}

export function TemplateTypeToggle({ value, onChange }: TemplateTypeToggleProps) {
    return (
        <div className="inline-flex items-center p-1 bg-muted rounded-lg">
            <button
                onClick={() => onChange("workflows")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    value === "workflows"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <GitBranch className="w-4 h-4" />
                Workflows
            </button>
            <button
                onClick={() => onChange("agents")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    value === "agents"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Bot className="w-4 h-4" />
                Agents
            </button>
        </div>
    );
}
