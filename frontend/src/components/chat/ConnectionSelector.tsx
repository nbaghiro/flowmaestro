import { Settings, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { LLM_MODELS_BY_PROVIDER, getDefaultModelForProvider } from "@flowmaestro/shared";
import { getConnections, type Connection } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useChatStore } from "../../stores/chatStore";

// Get list of provider values from the models registry
const LLM_PROVIDER_VALUES = Object.keys(LLM_MODELS_BY_PROVIDER);

export function ConnectionSelector() {
    const { selectedConnectionId, selectedModel, setConnection } = useChatStore();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch connections on mount
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const response = await getConnections({ status: "active" });
                if (response.success) {
                    const llmConnections = response.data.filter((conn) =>
                        LLM_PROVIDER_VALUES.includes(conn.provider)
                    );
                    setConnections(llmConnections);

                    // Auto-select first connection if none selected
                    if (!selectedConnectionId && llmConnections.length > 0) {
                        const firstConn = llmConnections[0];
                        const defaultModel = getDefaultModelForProvider(firstConn.provider);
                        setConnection(firstConn.id, defaultModel);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch connections:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConnections();
    }, []);

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);
    const availableModels = selectedConnection
        ? LLM_MODELS_BY_PROVIDER[selectedConnection.provider] || []
        : [];

    // Get short model nickname for display
    const getModelNickname = (modelValue: string | null): string => {
        if (!modelValue) return "";

        // Extract meaningful short name from model value
        if (modelValue.startsWith("gpt-")) {
            return modelValue.replace("gpt-", "GPT-").split("-")[0]; // "gpt-4o" -> "GPT-4o"
        }
        if (modelValue.startsWith("claude-")) {
            const parts = modelValue.split("-");
            return `Claude ${parts[1] || ""}`.trim(); // "claude-sonnet-4-5..." -> "Claude sonnet"
        }
        if (modelValue.startsWith("gemini-")) {
            return modelValue.replace("gemini-", "Gemini "); // "gemini-1.5-pro" -> "Gemini 1.5"
        }
        if (modelValue.startsWith("command")) {
            return modelValue.split("-")[0]; // "command-r-plus" -> "command"
        }

        return modelValue.split("-")[0] || modelValue;
    };

    const modelNickname = getModelNickname(selectedModel);

    const handleConnectionChange = (connectionId: string) => {
        const connection = connections.find((c) => c.id === connectionId);
        if (connection) {
            const defaultModel = getDefaultModelForProvider(connection.provider);
            setConnection(connectionId, defaultModel);
        }
        setIsOpen(false);
    };

    const handleModelChange = (model: string) => {
        if (selectedConnectionId) {
            setConnection(selectedConnectionId, model);
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
    );
}
