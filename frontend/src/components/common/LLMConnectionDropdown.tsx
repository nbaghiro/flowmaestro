/**
 * LLMConnectionDropdown Component
 *
 * A unified dropdown for selecting LLM connections and models.
 * Supports both compact (chat header) and full-width (form field) variants.
 * Optionally shows thinking capability badges and toggle.
 */

import { Brain, Settings, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    LLM_MODELS_BY_PROVIDER,
    LLM_PROVIDERS,
    getDefaultModelForProvider,
    getModelNickname,
    modelSupportsThinking
} from "@flowmaestro/shared";
import { getConnections, type Connection } from "../../lib/api";
import { logger } from "../../lib/logger";
import { cn } from "../../lib/utils";

// Get list of provider values from the models registry
const LLM_PROVIDER_VALUES = Object.keys(LLM_MODELS_BY_PROVIDER);

// Provider display order - derived from centralized LLM_PROVIDERS
// The order in LLM_PROVIDERS defines the preferred display order
const PROVIDER_ORDER = LLM_PROVIDERS.map((p) => p.value);

export interface ThinkingConfig {
    /** Whether extended thinking is enabled */
    enabled: boolean;
    /** Callback when thinking toggle changes */
    onEnabledChange: (enabled: boolean) => void;
}

export interface LLMConnectionDropdownProps {
    /** Currently selected connection ID */
    connectionId: string;
    /** Currently selected model */
    model: string;
    /** Callback when selection changes */
    onSelect: (connectionId: string, model: string, provider: string) => void;
    /** Optional: Pass connections instead of fetching internally */
    connections?: Connection[];
    /** Whether to fetch connections on mount (default: true if connections not provided) */
    fetchOnMount?: boolean;
    /** Whether to auto-select first connection if none selected */
    autoSelectFirst?: boolean;
    /** Display variant */
    variant?: "compact" | "full-width";
    /** Optional label (only shown for full-width variant) */
    label?: string;
    /** Placeholder text when nothing selected */
    placeholder?: string;
    /** Additional CSS classes for the trigger button */
    className?: string;
    /** Dropdown alignment */
    align?: "left" | "right";
    /** Whether to show thinking capability badges on models */
    showThinkingBadges?: boolean;
    /** Optional thinking toggle config - shows checkbox when model supports thinking */
    thinkingConfig?: ThinkingConfig;
}

export function LLMConnectionDropdown({
    connectionId,
    model,
    onSelect,
    connections: externalConnections,
    fetchOnMount = true,
    autoSelectFirst = true,
    variant = "compact",
    label,
    placeholder = "Select model",
    className,
    align = "right",
    showThinkingBadges = false,
    thinkingConfig
}: LLMConnectionDropdownProps) {
    const [internalConnections, setInternalConnections] = useState<Connection[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Calculate dropdown position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4, // 4px gap
                left: rect.left,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Use external connections if provided, otherwise use internal
    const connections = externalConnections ?? internalConnections;
    const shouldFetch = !externalConnections && fetchOnMount;

    // Check if current model supports thinking
    const currentModelSupportsThinking = model ? modelSupportsThinking(model) : false;

    // Fetch connections on mount if needed
    useEffect(() => {
        if (!shouldFetch) return;

        const fetchLLMConnections = async () => {
            setIsLoading(true);
            try {
                const response = await getConnections({ status: "active" });
                if (response.success) {
                    const llmConnections = response.data.filter((conn) =>
                        LLM_PROVIDER_VALUES.includes(conn.provider)
                    );
                    setInternalConnections(llmConnections);

                    // Auto-select first connection if none selected
                    if (autoSelectFirst && !connectionId && llmConnections.length > 0) {
                        const firstConn = sortConnections(llmConnections)[0];
                        const defaultModel = getDefaultModelForProvider(firstConn.provider);
                        onSelect(firstConn.id, defaultModel, firstConn.provider);
                    }
                }
            } catch (error) {
                logger.error("Failed to fetch connections", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLLMConnections();
    }, [shouldFetch]);

    // Sort connections by provider order
    const sortedConnections = useMemo(() => sortConnections(connections), [connections]);

    const selectedConnection = connections.find((c) => c.id === connectionId);
    const availableModels = selectedConnection
        ? LLM_MODELS_BY_PROVIDER[selectedConnection.provider] || []
        : [];

    const modelNickname = model ? getModelNickname(model) : "";

    const handleConnectionChange = (conn: Connection) => {
        const defaultModel = getDefaultModelForProvider(conn.provider);
        onSelect(conn.id, defaultModel, conn.provider);
        setIsOpen(false);
    };

    const handleModelChange = (modelValue: string) => {
        if (selectedConnection) {
            onSelect(connectionId, modelValue, selectedConnection.provider);
        }
        setIsOpen(false);
    };

    // Loading state (only for internal fetching)
    if (shouldFetch && isLoading) {
        if (variant === "compact") {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                    <Settings className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                </div>
            );
        }
        return (
            <div>
                {label && (
                    <label className="block text-sm font-medium text-foreground mb-2">
                        {label}
                    </label>
                )}
                <div className="px-4 py-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                    Loading connections...
                </div>
            </div>
        );
    }

    // Empty state
    if (connections.length === 0) {
        if (variant === "compact") {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-orange-600 dark:text-orange-400">
                    <Settings className="w-3.5 h-3.5" />
                    <span>No LLM connections</span>
                </div>
            );
        }
        return (
            <div>
                {label && (
                    <label className="block text-sm font-medium text-foreground mb-2">
                        {label}
                    </label>
                )}
                <div className="px-4 py-3 rounded-lg border border-border bg-muted text-sm text-orange-600 dark:text-orange-400">
                    No LLM connections available. Please add a connection first.
                </div>
            </div>
        );
    }

    // Display text based on variant
    const displayText =
        variant === "compact"
            ? modelNickname || placeholder
            : selectedConnection
              ? `${selectedConnection.name} - ${modelNickname}`
              : placeholder;

    // Whether to show the thinking toggle section
    const showThinkingToggle = thinkingConfig && currentModelSupportsThinking;

    return (
        <div>
            {variant === "full-width" && label && (
                <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
            )}
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        variant === "compact"
                            ? [
                                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                                  "hover:bg-muted transition-colors",
                                  "text-muted-foreground"
                              ]
                            : [
                                  "w-full px-4 py-3 rounded-lg border border-border",
                                  "bg-muted text-foreground text-left",
                                  "hover:bg-muted/80 transition-colors",
                                  "flex items-center justify-between"
                              ],
                        className
                    )}
                >
                    {variant === "compact" && <Settings className="w-3.5 h-3.5" />}
                    <span className={variant === "compact" ? "font-medium" : "text-sm"}>
                        {displayText}
                    </span>
                    <ChevronDown
                        className={
                            variant === "compact" ? "w-3 h-3" : "w-4 h-4 text-muted-foreground"
                        }
                    />
                </button>

                {isOpen &&
                    createPortal(
                        <>
                            {/* Backdrop */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                            {/* Dropdown */}
                            <div
                                className={cn(
                                    "fixed bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden",
                                    variant === "compact" &&
                                        (showThinkingBadges || thinkingConfig ? "w-72" : "w-64")
                                )}
                                style={{
                                    top: dropdownPosition.top,
                                    left:
                                        variant === "compact" && align === "right"
                                            ? "auto"
                                            : dropdownPosition.left,
                                    right:
                                        variant === "compact" && align === "right"
                                            ? window.innerWidth -
                                              dropdownPosition.left -
                                              dropdownPosition.width
                                            : "auto",
                                    width:
                                        variant === "full-width"
                                            ? dropdownPosition.width
                                            : undefined
                                }}
                            >
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
                                                    connectionId === conn.id
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
                                    <div
                                        className={cn(
                                            "p-2",
                                            showThinkingToggle && "border-b border-border"
                                        )}
                                    >
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                                            Model
                                        </p>
                                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                            {availableModels.map((m) => (
                                                <button
                                                    key={m.value}
                                                    onClick={() => handleModelChange(m.value)}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1.5 rounded text-xs",
                                                        "hover:bg-muted transition-colors",
                                                        model === m.value
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-foreground"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {m.label}
                                                        {showThinkingBadges &&
                                                            m.supportsThinking && (
                                                                <Brain className="w-3 h-3 text-amber-500" />
                                                            )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Thinking Toggle Section */}
                                {showThinkingToggle && (
                                    <div className="p-2">
                                        <label className="flex items-center gap-2 px-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={thinkingConfig.enabled}
                                                onChange={(e) =>
                                                    thinkingConfig.onEnabledChange(e.target.checked)
                                                }
                                                className="rounded border-border"
                                            />
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Brain className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Enable Extended Thinking</span>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </>,
                        document.body
                    )}
            </div>
        </div>
    );
}

/** Sort connections by provider order, then alphabetically by name */
function sortConnections(connections: Connection[]): Connection[] {
    return [...connections].sort((a, b) => {
        const aIndex = PROVIDER_ORDER.indexOf(a.provider.toLowerCase());
        const bIndex = PROVIDER_ORDER.indexOf(b.provider.toLowerCase());
        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        }
        return a.name.localeCompare(b.name);
    });
}
