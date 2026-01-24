import {
    FileText,
    Sparkles,
    TrendingUp,
    BarChart3,
    LineChart,
    Search,
    Shield,
    BookOpen,
    PenLine,
    Code,
    FileCode,
    type LucideIcon
} from "lucide-react";
import React from "react";
import type { PersonaTaskTemplateSummary } from "../../../lib/api";

// Map emoji icons to Lucide icons
const iconMap: Record<string, LucideIcon> = {
    "📊": BarChart3,
    "📈": LineChart,
    "🔮": Sparkles,
    "🔍": Search,
    "🔒": Shield,
    "📚": BookOpen,
    "📝": PenLine,
    "✍️": PenLine,
    "💻": Code,
    "🧪": FileCode
};

function getTemplateIcon(icon: string | null, isSelected: boolean): React.ReactNode {
    if (!icon) {
        return (
            <FileText
                className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
            />
        );
    }

    const IconComponent = iconMap[icon];
    if (IconComponent) {
        return (
            <IconComponent
                className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
            />
        );
    }

    // Fallback to displaying the emoji if no mapping found
    return icon;
}

interface TemplateSelectorProps {
    templates: PersonaTaskTemplateSummary[];
    selectedTemplateId: string | null;
    onSelect: (template: PersonaTaskTemplateSummary | null) => void;
    disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
    templates,
    selectedTemplateId,
    onSelect,
    disabled
}) => {
    if (templates.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Quick Start Templates
                </label>
                {selectedTemplateId && (
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        disabled={disabled}
                    >
                        Clear selection
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onSelect(isSelected ? null : template)}
                            disabled={disabled}
                            className={`
                                relative flex items-start gap-3 p-3 rounded-lg border text-left transition-all
                                ${
                                    isSelected
                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                }
                                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                            `}
                        >
                            {/* Icon */}
                            <div
                                className={`
                                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                                    ${isSelected ? "bg-primary/20" : "bg-muted"}
                                `}
                            >
                                {getTemplateIcon(template.icon, isSelected)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`
                                            font-medium text-sm truncate
                                            ${isSelected ? "text-primary" : "text-foreground"}
                                        `}
                                    >
                                        {template.name}
                                    </span>
                                    {template.usage_count > 10 && (
                                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                            <TrendingUp className="w-3 h-3" />
                                            Popular
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {template.description}
                                </p>
                            </div>

                            {/* Selected indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-muted-foreground">
                Select a template for a guided experience, or skip to create a custom task.
            </p>
        </div>
    );
};
