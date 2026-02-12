/**
 * Trigger Panel Content
 * Main content for the trigger drawer - list of triggers and create functionality
 */

import { RefreshCw, Zap } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { TriggerEvents } from "../../lib/analytics";
import { getTriggers } from "../../lib/api";
import { logger } from "../../lib/logger";
import { useTriggerStore } from "../../stores/triggerStore";
import { CreateTriggerDialog } from "./dialogs/CreateTriggerDialog";
import { TriggerCard } from "./TriggerCard";

interface TriggerPanelContentProps {
    workflowId: string;
}

export function TriggerPanelContent({ workflowId }: TriggerPanelContentProps) {
    const { triggers, loadingTriggers, setTriggers, setLoadingTriggers } = useTriggerStore();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasTrackedListView = useRef(false);

    const loadTriggerList = useCallback(async () => {
        if (!workflowId) return;

        setLoadingTriggers(true);
        setError(null);

        try {
            const response = await getTriggers(workflowId);
            if (response.success && response.data) {
                setTriggers(response.data);
                // Track list viewed (only once per mount)
                if (!hasTrackedListView.current) {
                    TriggerEvents.listViewed({ workflowId });
                    hasTrackedListView.current = true;
                }
            }
        } catch (err) {
            logger.error("Failed to load triggers", err);
            setError("Failed to load triggers. Please try again.");
        } finally {
            setLoadingTriggers(false);
        }
    }, [workflowId, setLoadingTriggers, setTriggers]);

    // Load triggers on mount and when workflowId changes
    useEffect(() => {
        loadTriggerList();
    }, [loadTriggerList]);

    // Listen for create trigger event
    useEffect(() => {
        const handleCreateTrigger = () => {
            setShowCreateDialog(true);
        };

        window.addEventListener("trigger:create", handleCreateTrigger);
        return () => window.removeEventListener("trigger:create", handleCreateTrigger);
    }, []);

    const handleTriggerCreated = () => {
        setShowCreateDialog(false);
        loadTriggerList();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {error && (
                    <div className="mx-4 mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}

                {loadingTriggers && triggers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Loading triggers...</p>
                    </div>
                ) : triggers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Zap className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">No Triggers Yet</h4>
                        <p className="text-sm text-muted-foreground">
                            Click the + icon above to add your first trigger and automate this
                            workflow.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {triggers.map((trigger) => (
                            <TriggerCard
                                key={trigger.id}
                                trigger={trigger}
                                onUpdate={loadTriggerList}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <CreateTriggerDialog
                    isOpen={showCreateDialog}
                    workflowId={workflowId}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={handleTriggerCreated}
                />
            )}
        </div>
    );
}
