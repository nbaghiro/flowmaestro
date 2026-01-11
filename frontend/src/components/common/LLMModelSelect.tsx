/**
 * LLMModelSelect Component
 *
 * A specialized select component for choosing LLM models.
 * Automatically filters models by provider and shows thinking capability badges.
 */

import * as SelectPrimitive from "@radix-ui/react-select";
import { Brain, Check, ChevronDown } from "lucide-react";
import { getModelsForProvider, type LLMModelDefinition } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";

export interface LLMModelSelectProps {
    /** The provider to filter models by (e.g., "openai", "anthropic") */
    provider: string;
    /** The currently selected model value */
    value: string;
    /** Callback when model selection changes */
    onChange: (model: string) => void;
    /** Optional placeholder text */
    placeholder?: string;
    /** Whether the select is disabled */
    disabled?: boolean;
    /** Optional CSS class name */
    className?: string;
    /** Whether to show thinking capability indicator */
    showThinkingBadge?: boolean;
    /** Optional error message */
    error?: string;
}

export function LLMModelSelect({
    provider,
    value,
    onChange,
    placeholder = "Select a model...",
    disabled = false,
    className,
    showThinkingBadge = true,
    error
}: LLMModelSelectProps) {
    const models = getModelsForProvider(provider);

    if (models.length === 0) {
        return (
            <div
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm",
                    "bg-muted border border-border rounded-lg text-muted-foreground"
                )}
            >
                No models available for this provider
            </div>
        );
    }

    return (
        <SelectPrimitive.Root
            value={value || undefined}
            onValueChange={onChange}
            disabled={disabled}
        >
            <SelectPrimitive.Trigger
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm",
                    "bg-card border border-border rounded-lg text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "data-[placeholder]:text-muted-foreground",
                    error && "border-destructive focus:ring-destructive",
                    className
                )}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon className="ml-2">
                    <ChevronDown className="w-4 h-4" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className={cn(
                        "overflow-hidden bg-card border border-border rounded-lg shadow-lg",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "max-h-[300px]",
                        "z-[100]"
                    )}
                    position="popper"
                    sideOffset={4}
                >
                    <SelectPrimitive.Viewport
                        className="p-1 max-h-[300px] overflow-y-auto"
                        style={
                            {
                                scrollbarWidth: "thin",
                                scrollbarColor: "hsl(var(--border)) transparent"
                            } as React.CSSProperties
                        }
                    >
                        {models.map((model) => (
                            <LLMModelSelectItem
                                key={model.value}
                                model={model}
                                showThinkingBadge={showThinkingBadge}
                            />
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

interface LLMModelSelectItemProps {
    model: LLMModelDefinition;
    showThinkingBadge: boolean;
}

function LLMModelSelectItem({ model, showThinkingBadge }: LLMModelSelectItemProps) {
    return (
        <SelectPrimitive.Item
            value={model.value}
            disabled={model.deprecated}
            className={cn(
                "relative flex items-center w-full px-8 py-2 text-sm rounded-md cursor-pointer select-none",
                "text-foreground",
                "focus:bg-primary/10 focus:outline-none",
                "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
            )}
        >
            <span className="absolute left-2 flex items-center justify-center w-4 h-4">
                <SelectPrimitive.ItemIndicator>
                    <Check className="w-4 h-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>
                <span className="flex items-center gap-2">
                    {model.label}
                    {showThinkingBadge && model.supportsThinking && (
                        <Brain className="w-3.5 h-3.5 text-violet-500" />
                    )}
                </span>
            </SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}
