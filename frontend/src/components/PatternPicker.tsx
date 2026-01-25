import {
    MessageSquare,
    MessageCircle,
    Link,
    GitBranch,
    GitPullRequest,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    UserPlus,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2,
    Languages,
    ShoppingCart,
    FileStack,
    Route,
    Database,
    ClipboardCheck,
    BookOpen,
    type LucideIcon
} from "lucide-react";
import type { WorkflowPattern } from "@flowmaestro/shared";
import { cn } from "../lib/utils";
import { ProviderIconList } from "./common/ProviderIconList";
import { WorkflowCanvasPreview, type WorkflowDefinition } from "./common/WorkflowCanvasPreview";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
    MessageSquare,
    MessageCircle,
    Link,
    GitBranch,
    GitPullRequest,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    UserPlus,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2,
    Languages,
    ShoppingCart,
    FileStack,
    Route,
    Database,
    ClipboardCheck,
    BookOpen
};

interface PatternPickerProps {
    patterns: WorkflowPattern[];
    selectedPatternId: string | null;
    onSelect: (pattern: WorkflowPattern) => void;
}

interface PatternCardProps {
    pattern: WorkflowPattern;
    isSelected: boolean;
    onClick: () => void;
}

function PatternCard({ pattern, isSelected, onClick }: PatternCardProps) {
    const Icon = iconMap[pattern.icon] || Plus;

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col",
                isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border hover:border-border/60 hover:shadow-md"
            )}
        >
            {/* React Flow Preview */}
            <div className="h-52 relative overflow-hidden flex-shrink-0">
                <WorkflowCanvasPreview
                    definition={pattern.definition as WorkflowDefinition}
                    height="h-full"
                    className="!shadow-none"
                />

                {/* Selection indicator */}
                {isSelected && (
                    <div className="absolute top-2 right-2 z-10">
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
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
                    <h3 className="font-semibold text-foreground line-clamp-1">{pattern.name}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {pattern.description}
                </p>

                {/* Footer - pinned to bottom */}
                <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded-full">
                            {pattern.nodeCount} nodes
                        </span>
                        <span>{pattern.useCase}</span>
                    </div>

                    {/* Integration icons for intermediate/advanced patterns */}
                    {pattern.integrations && pattern.integrations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                            <ProviderIconList
                                providers={pattern.integrations}
                                maxVisible={5}
                                iconSize="sm"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PatternPicker({ patterns, selectedPatternId, onSelect }: PatternPickerProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
