import { Settings, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import {
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider,
    getModelNickname
} from "@flowmaestro/shared";
import { getConnections, type Connection, type Agent } from "../../lib/api";
import { logger } from "../../lib/logger";
import { cn } from "../../lib/utils";

// Get list of provider values from the models registry
const LLM_PROVIDER_VALUES = Object.keys(LLM_MODELS_BY_PROVIDER);

// Define provider display order
const PROVIDER_ORDER = ["openai", "anthropic", "google", "cohere", "huggingface"];

interface AgentConnectionSelectorProps {
    agent: Agent;
    overrideConnectionId?: string | null;
    overrideModel?: string | null;
    onOverrideChange: (connectionId: string, model: string) => void;
}

export function AgentConnectionSelector({
    agent,
    overrideConnectionId,
    overrideModel,
    onOverrideChange
}: AgentConnectionSelectorProps) {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch connections on mount
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const response = await getConnections({ status: "active" });
                if (response.success) {
                    const llmConnections = response.data
                        .filter((conn) => LLM_PROVIDER_VALUES.includes(conn.provider))
                        .sort((a, b) => {
                            const aIndex = PROVIDER_ORDER.indexOf(a.provider);
                            const bIndex = PROVIDER_ORDER.indexOf(b.provider);
                            // Sort by provider order, then alphabetically by name within same provider
                            if (aIndex !== bIndex) {
                                return aIndex - bIndex;
                            }
                            return a.name.localeCompare(b.name);
                        });
                    setConnections(llmConnections);
                }
            } catch (error) {
                logger.error("Failed to fetch connections", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConnections();
    }, []);

    // Use override if provided, otherwise fall back to agent's settings
    const activeConnectionId = overrideConnectionId || agent.connection_id || "";
    const activeModel = overrideModel || agent.model;

    const selectedConnection = connections.find((c) => c.id === activeConnectionId);
    const availableModels = selectedConnection
        ? LLM_MODELS_BY_PROVIDER[selectedConnection.provider] || []
        : [];

    const modelNickname = activeModel ? getModelNickname(activeModel) : "";

    const handleConnectionChange = (connectionId: string) => {
        const connection = connections.find((c) => c.id === connectionId);
        if (connection) {
            const defaultModel = getDefaultModelForProvider(connection.provider);
            onOverrideChange(connectionId, defaultModel);
        }
        setIsOpen(false);
    };

    const handleModelChange = (model: string) => {
        if (activeConnectionId) {
            onOverrideChange(activeConnectionId, model);
        }
        setIsOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                <Settings className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
            </div>
        );
    }

    if (connections.length === 0) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-orange-600 dark:text-orange-400">
                <Settings className="w-3.5 h-3.5" />
                <span>No LLM connections</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                    "hover:bg-muted transition-colors",
                    "text-muted-foreground"
                )}
            >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-medium">{modelNickname || "Select model"}</span>
                <ChevronDown className="w-3 h-3" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        {/* Connections Section */}
                        <div className="p-2 border-b border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                Connection
                            </p>
                            <div className="space-y-0.5">
                                {connections.map((conn) => (
                                    <button
                                        key={conn.id}
                                        onClick={() => handleConnectionChange(conn.id)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded text-xs",
                                            "hover:bg-muted transition-colors",
                                            activeConnectionId === conn.id
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
                                                activeModel === model.value
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
    );
}
