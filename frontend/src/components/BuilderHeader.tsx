import { Save, Play, Loader2, CheckCircle, XCircle, Settings, Layers } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkflowTrigger } from "@flowmaestro/shared";
import { executeTrigger, createTrigger, getTriggers } from "../lib/api";
import { wsClient } from "../lib/websocket";
import { useTriggerStore } from "../stores/triggerStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { Input } from "./common/Input";
import { Logo } from "./common/Logo";
import { Tooltip } from "./common/Tooltip";

interface BuilderHeaderProps {
    workflowId?: string;
    workflowName?: string;
    hasUnsavedChanges?: boolean;
    saveStatus?: "idle" | "saving" | "saved" | "error";
    onSave?: () => void;
    onNameChange?: (name: string) => void;
    onOpenSettings?: () => void;
    onOpenCheckpoints?: () => void;
}

export function BuilderHeader({
    workflowId,
    workflowName = "Untitled Workflow",
    hasUnsavedChanges = false,
    saveStatus = "idle",
    onSave,
    onNameChange,
    onOpenSettings,
    onOpenCheckpoints
}: BuilderHeaderProps) {
    const { startExecution, currentExecution, selectNode } = useWorkflowStore();
    const { setDrawerOpen } = useTriggerStore();
    const navigate = useNavigate();
    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState<string | null>(null);

    const handleRun = async () => {
        if (!workflowId) {
            console.error("Cannot run workflow: workflowId is not provided");
            setRunError("Workflow ID is missing");
            return;
        }

        setIsRunning(true);
        setRunError(null);

        try {
            // Fetch all triggers for this workflow to check if __run_button__ exists
            const triggersResponse = await getTriggers(workflowId);
            let manualTrigger: WorkflowTrigger | undefined;

            if (triggersResponse.success && triggersResponse.data) {
                // Find existing __run_button__ trigger
                manualTrigger = triggersResponse.data.find(
                    (t) => t.trigger_type === "manual" && t.name === "__run_button__"
                );
            }

            // Default input for the run button trigger
            const defaultInputs = { userInput: "Hello" };

            // If no background trigger exists, create one
            if (!manualTrigger) {
                console.log("Creating background manual trigger for Run button");
                const createResponse = await createTrigger({
                    workflowId: workflowId,
                    name: "__run_button__",
                    triggerType: "manual",
                    config: {
                        description: "Auto-created trigger for Run button",
                        inputs: defaultInputs
                    },
                    enabled: true
                });

                if (createResponse.success && createResponse.data) {
                    manualTrigger = createResponse.data;
                } else {
                    throw new Error("Failed to create background trigger");
                }
            } else {
                console.log("Reusing existing __run_button__ trigger:", manualTrigger.id);
            }

            // Execute trigger with default inputs
            const response = await executeTrigger(manualTrigger.id, defaultInputs);

            if (response.success && response.data) {
                // Clear any selected node to prevent auto-close
                selectNode(null);

                // Start execution monitoring in the workflow store
                startExecution(response.data.executionId, manualTrigger.id);

                // Subscribe to WebSocket events for this execution
                wsClient.subscribeToExecution(response.data.executionId);

                // Open execution panel automatically
                // Note: ExecutionPanel will auto-open and switch to execution tab
                // when currentExecution is set, but we also explicitly open it here
                setDrawerOpen(true);
            }
        } catch (error) {
            console.error("Failed to execute workflow:", error);
            setRunError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsRunning(false);
        }
    };

    const handleBack = () => {
        navigate("/");
    };

    return (
        <header className="bg-card border-b border-border shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left: Logo and Label */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="hover:opacity-80 transition-opacity"
                        title="Back to Library"
                    >
                        <Logo size="md" />
                    </button>
                    <span className="text-sm font-medium text-foreground">Workflow Builder</span>
                </div>

                {/* Center: Workflow Name and Status */}
                <div className="flex-1 flex items-center justify-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <Input
                            type="text"
                            value={workflowName}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            className="text-base font-semibold bg-transparent border-none outline-none focus:bg-muted/50 px-3 py-1.5 rounded transition-colors text-center min-w-[200px] max-w-full"
                            placeholder="Untitled Workflow"
                            style={{ width: `${Math.max(200, workflowName.length * 10)}px` }}
                        />
                        {hasUnsavedChanges && (
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                                Unsaved
                            </span>
                        )}
                    </div>

                    {/* Execution Status */}
                    {currentExecution?.status === "running" && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Executing...</span>
                        </div>
                    )}

                    {currentExecution?.status === "completed" && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 dark:bg-green-400/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Success</span>
                        </div>
                    )}

                    {currentExecution?.status === "failed" && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 dark:bg-red-400/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            <XCircle className="w-4 h-4" />
                            <span>Failed</span>
                        </div>
                    )}

                    {runError && !currentExecution && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 dark:bg-red-400/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            <XCircle className="w-4 h-4" />
                            <span>{runError}</span>
                        </div>
                    )}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                    <Tooltip content="Checkpoints (⌘.)" position="bottom">
                        <button
                            onClick={onOpenCheckpoints}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Workflow settings (⌘,)" position="bottom">
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </Tooltip>

                    <Tooltip content="Save workflow (⌘S / Ctrl+S)" position="bottom">
                        <button
                            onClick={onSave}
                            disabled={saveStatus === "saving"}
                            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saveStatus === "saving" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : saveStatus === "saved" ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Saved
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save
                                </>
                            )}
                        </button>
                    </Tooltip>

                    <Tooltip
                        content={
                            !workflowId
                                ? "Save workflow first"
                                : "Run workflow (⌘Enter / Ctrl+Enter)"
                        }
                        position="bottom"
                    >
                        <button
                            onClick={handleRun}
                            disabled={isRunning || currentExecution?.status === "running"}
                            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                            data-action="run"
                        >
                            {isRunning || currentExecution?.status === "running" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            {isRunning || currentExecution?.status === "running"
                                ? "Running..."
                                : "Run"}
                        </button>
                    </Tooltip>
                </div>
            </div>
        </header>
    );
}
