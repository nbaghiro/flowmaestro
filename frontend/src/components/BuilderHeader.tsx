import {
    Save,
    Play,
    Loader2,
    CheckCircle,
    XCircle,
    Settings,
    Layers,
    FileText,
    CheckCircle2
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkflowTrigger } from "@flowmaestro/shared";
import { executeTrigger, createTrigger, getTriggers } from "../lib/api";
import { logger } from "../lib/logger";
import { useWorkflowStore } from "../stores/workflowStore";
import { Input } from "./common/Input";
import { Logo } from "./common/Logo";
import { OverflowMenu } from "./common/OverflowMenu";
import { ThemeToggle } from "./common/ThemeToggle";
import { Tooltip } from "./common/Tooltip";
import { ValidationErrorsDialog } from "./validation/ValidationErrorsDialog";
import { ValidationSummaryBadge } from "./validation/ValidationPanel";
import type { OverflowMenuItem } from "./common/OverflowMenu";

interface BuilderHeaderProps {
    workflowId?: string;
    workflowName?: string;
    hasUnsavedChanges?: boolean;
    saveStatus?: "idle" | "saving" | "saved" | "error";
    onSave?: () => void;
    onNameChange?: (name: string) => void;
    onOpenSettings?: () => void;
    onOpenCheckpoints?: () => void;
    onOpenFormInterface?: () => void;
    onOpenValidation?: () => void;
    onBack?: () => void;
    onOpenExecution?: () => void;
}

export function BuilderHeader({
    workflowId,
    workflowName = "Untitled Workflow",
    hasUnsavedChanges = false,
    saveStatus = "idle",
    onSave,
    onNameChange,
    onOpenSettings,
    onOpenCheckpoints,
    onOpenFormInterface,
    onOpenValidation,
    onBack,
    onOpenExecution
}: BuilderHeaderProps) {
    const { startExecution, currentExecution, selectNode, workflowValidation, nodes } =
        useWorkflowStore();
    const navigate = useNavigate();
    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState<string | null>(null);
    const [showValidationDialog, setShowValidationDialog] = useState(false);

    // Build node name lookup map for validation dialog
    const nodeNames = useMemo(() => {
        const map = new Map<string, string>();
        for (const node of nodes) {
            const label = (node.data?.label as string) || node.type || node.id;
            map.set(node.id, label);
        }
        return map;
    }, [nodes]);

    // Check if workflow has validation errors (not warnings, only errors block execution)
    const hasValidationErrors = workflowValidation && !workflowValidation.isValid;

    const handleRun = async () => {
        if (!workflowId) {
            logger.error("Cannot run workflow: workflowId is not provided");
            setRunError("Workflow ID is missing");
            return;
        }

        // Block execution if there are validation errors
        if (hasValidationErrors) {
            setShowValidationDialog(true);
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
                logger.debug("Creating background manual trigger for Run button");
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
                logger.debug("Reusing existing __run_button__ trigger", {
                    triggerId: manualTrigger.id
                });
            }

            // Execute trigger with default inputs
            const response = await executeTrigger(manualTrigger.id, defaultInputs);

            if (response.success && response.data) {
                const executionId = response.data.executionId;

                // Clear any selected node to prevent auto-close
                selectNode(null);

                // Start execution monitoring in the workflow store
                // SSE connection is managed by ExecutionPanel
                startExecution(executionId, manualTrigger.id);

                // Open execution panel automatically
                onOpenExecution?.();
            }
        } catch (error) {
            logger.error("Failed to execute workflow", error);
            setRunError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsRunning(false);
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    const overflowMenuItems: OverflowMenuItem[] = [
        {
            icon: <Settings className="w-4 h-4" />,
            label: "Workflow Settings",
            shortcut: "⌘,",
            onClick: () => onOpenSettings?.()
        },
        {
            icon: <Layers className="w-4 h-4" />,
            label: "Checkpoints",
            shortcut: "⌘.",
            onClick: () => onOpenCheckpoints?.()
        },
        ...(onOpenFormInterface
            ? [
                  {
                      icon: <FileText className="w-4 h-4" />,
                      label: "Form Interface",
                      onClick: () => onOpenFormInterface()
                  }
              ]
            : []),
        {
            icon: <CheckCircle2 className="w-4 h-4" />,
            label: "Validation",
            onClick: () => onOpenValidation?.()
        }
    ];

    return (
        <header className="bg-card border-b border-border shadow-sm">
            <div className="relative flex items-center justify-between px-6 py-3">
                {/* Left: Logo and Label */}
                <div className="flex items-center gap-3 z-10">
                    <button
                        onClick={handleBack}
                        className="hover:opacity-80 transition-opacity"
                        title="Back to Library"
                    >
                        <Logo size="md" />
                    </button>
                    <span className="text-sm font-medium text-foreground">Workflow Builder</span>
                </div>

                {/* Center: Workflow Name and Status - Absolutely positioned for true centering */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                value={workflowName}
                                onChange={(e) => onNameChange?.(e.target.value)}
                                className="text-base font-semibold bg-transparent border-none outline-none focus:bg-muted/50 px-3 py-1.5 rounded transition-colors text-center min-w-[200px]"
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
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 z-10">
                    <ThemeToggle />
                    <ValidationSummaryBadge onClick={() => onOpenValidation?.()} />

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

                    <OverflowMenu items={overflowMenuItems} />
                </div>
            </div>

            {/* Validation Errors Dialog */}
            <ValidationErrorsDialog
                isOpen={showValidationDialog}
                onClose={() => setShowValidationDialog(false)}
                validationResult={workflowValidation}
                nodeNames={nodeNames}
                onOpenValidationPanel={onOpenValidation}
            />
        </header>
    );
}
