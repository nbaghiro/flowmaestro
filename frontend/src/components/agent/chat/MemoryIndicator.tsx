/**
 * MemoryIndicator Component
 *
 * Compact memory indicator for the chat header.
 * Shows a brain icon that opens a popover with memory stats.
 */

import { Brain, Database, MessageSquare, Loader2, AlertCircle, X, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getAgentMemoryStats, clearAllAgentMemory, type AgentMemoryStats } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { Tooltip } from "../../common/Tooltip";

interface MemoryIndicatorProps {
    agentId: string;
}

export function MemoryIndicator({ agentId }: MemoryIndicatorProps) {
    const [stats, setStats] = useState<AgentMemoryStats | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Load stats when opened
    const loadStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const statsResponse = await getAgentMemoryStats(agentId);
            setStats(statsResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load memory stats");
        } finally {
            setIsLoading(false);
        }
    }, [agentId]);

    // Clear all memory
    const handleClearMemory = async () => {
        setIsClearing(true);
        setError(null);
        try {
            await clearAllAgentMemory(agentId);
            // Refresh stats after clearing
            await loadStats();
            setShowClearConfirm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to clear memory");
        } finally {
            setIsClearing(false);
        }
    };

    // Calculate dropdown position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.right - 220 // Right-align the 220px wide dropdown
            });
        }
    }, [isOpen]);

    // Load stats when opened
    useEffect(() => {
        if (isOpen) {
            loadStats();
        }
    }, [isOpen, loadStats]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                const dropdown = document.getElementById("memory-indicator-dropdown");
                if (dropdown && !dropdown.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    const hasMemory = stats && (stats.working_memory_count > 0 || stats.embedding_count > 0);

    return (
        <>
            <Tooltip content="Agent Memory" position="bottom">
                <button
                    ref={buttonRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center px-2 py-1.5 rounded-md text-xs transition-colors",
                        "hover:bg-muted border border-transparent hover:border-border text-muted-foreground hover:text-foreground",
                        isOpen && "bg-muted border-border text-foreground"
                    )}
                >
                    <Brain className="w-3.5 h-3.5" />
                </button>
            </Tooltip>

            {isOpen &&
                createPortal(
                    <div
                        id="memory-indicator-dropdown"
                        className="fixed z-50 w-[220px] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                            <div className="flex items-center gap-2">
                                <Brain className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-medium">Memory</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : error ? (
                                <div className="flex items-center gap-2 text-xs text-destructive py-2">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : stats ? (
                                <div className="space-y-3">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                            <Database className="w-3.5 h-3.5 text-blue-500" />
                                            <div>
                                                <p className="text-xs font-medium">
                                                    {stats.working_memory_count}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Working
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                                            <div>
                                                <p className="text-xs font-medium">
                                                    {stats.embedding_count}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Embedded
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clear button - only show if there's memory */}
                                    {hasMemory && (
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            disabled={isClearing}
                                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {isClearing ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3 h-3" />
                                            )}
                                            <span>Clear all memory</span>
                                        </button>
                                    )}

                                    {/* Status message */}
                                    {!hasMemory && (
                                        <p className="text-[10px] text-muted-foreground text-center">
                                            No memories stored yet
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>,
                    document.body
                )}

            {/* Clear confirmation dialog */}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearMemory}
                title="Clear All Memory"
                message="This will permanently delete all working memories and conversation embeddings for this agent. This action cannot be undone."
                confirmText="Clear Memory"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
}
