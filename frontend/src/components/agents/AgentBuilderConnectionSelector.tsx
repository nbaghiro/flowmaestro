import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { LLM_MODELS_BY_PROVIDER, getDefaultModelForProvider } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import type { Connection } from "../../lib/api";

interface AgentBuilderConnectionSelectorProps {
    connections: Connection[];
    selectedConnectionId: string;
    selectedModel: string;
    onConnectionChange: (connectionId: string, provider: string, model: string) => void;
}

// Define provider display order
const PROVIDER_ORDER = ["openai", "anthropic", "google", "cohere", "huggingface"];

export function AgentBuilderConnectionSelector({
    connections,
    selectedConnectionId,
    selectedModel,
    onConnectionChange
}: AgentBuilderConnectionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Sort connections by provider order
    const sortedConnections = [...connections].sort((a, b) => {
        const aIndex = PROVIDER_ORDER.indexOf(a.provider.toLowerCase());
        const bIndex = PROVIDER_ORDER.indexOf(b.provider.toLowerCase());
        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        }
        return a.name.localeCompare(b.name);
    });

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);
    const availableModels = selectedConnection
        ? LLM_MODELS_BY_PROVIDER[selectedConnection.provider] || []
        : [];

    // Get model display name with parenthetical descriptions removed
    const getModelNickname = (modelValue: string | null): string => {
        if (!modelValue) return "";

        const model = availableModels.find((m) => m.value === modelValue);
        if (model) {
            return model.label.replace(/\s*\([^)]*\)/g, "").trim();
        }

        return modelValue;
    };

    const displayText = selectedConnection
        ? `${selectedConnection.name} - ${getModelNickname(selectedModel)}`
        : "Select connection and model";

    const handleConnectionChange = (connection: Connection) => {
        const defaultModel = getDefaultModelForProvider(connection.provider);
        onConnectionChange(connection.id, connection.provider, defaultModel);
        setIsOpen(false);
    };

    const handleModelChange = (modelValue: string) => {
        if (selectedConnection) {
            onConnectionChange(selectedConnection.id, selectedConnection.provider, modelValue);
        }
        setIsOpen(false);
    };

    if (connections.length === 0) {
        return (
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    AI Model Selection
                </label>
                <div className="px-4 py-3 rounded-lg border border-border bg-muted text-sm text-orange-600 dark:text-orange-400">
                    No LLM connections available. Please add a connection first.
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-foreground mb-2">
                AI Model Selection
            </label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full px-4 py-3 rounded-lg border border-border",
                        "bg-background text-foreground text-left",
                        "hover:bg-muted transition-colors",
                        "flex items-center justify-between"
                    )}
                >
                    <span className="text-sm">{displayText}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                        {/* Dropdown */}
                        <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                            {/* Connections Section */}
                            <div className="p-2 border-b border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                    Connection
                                </p>
                                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                    {sortedConnections.map((conn) => (
                                        <button
                                            key={conn.id}
                                            onClick={() => handleConnectionChange(conn)}
                                            className={cn(
                                                "w-full text-left px-2 py-1.5 rounded text-xs",
                                                "hover:bg-muted transition-colors",
                                                selectedConnectionId === conn.id
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground"
                                            )}
                                        >
                                            <div className="font-medium">{conn.name}</div>
                                            <div className="text-[10px] text-muted-foreground capitalize">
                                                {conn.provider}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Models Section */}
                            {availableModels.length > 0 && (
                                <div className="p-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                        Model
                                    </p>
                                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                        {availableModels.map((model) => (
                                            <button
                                                key={model.value}
                                                onClick={() => handleModelChange(model.value)}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded text-xs",
                                                    "hover:bg-muted transition-colors",
                                                    selectedModel === model.value
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground"
                                                )}
                                            >
                                                {model.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
