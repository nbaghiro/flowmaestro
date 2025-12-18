/**
 * Trigger Card Component
 * Displays individual trigger with details and actions
 */

import {
    Calendar,
    Webhook,
    Zap,
    Copy,
    Trash2,
    Power,
    PowerOff,
    MoreVertical,
    Play,
    Pencil,
    FileUp
} from "lucide-react";
import { useState } from "react";
import type {
    WorkflowTrigger,
    ScheduleTriggerConfig,
    WebhookTriggerConfig,
    ManualTriggerConfig,
    FileTriggerConfig
} from "@flowmaestro/shared";
import { getWebhookUrl, deleteTrigger, updateTrigger, executeTrigger } from "../../lib/api";
import { cn } from "../../lib/utils";
import { wsClient } from "../../lib/websocket";
import { useWorkflowStore } from "../../stores/workflowStore";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";

interface TriggerCardProps {
    trigger: WorkflowTrigger;
    onUpdate: () => void;
}

export function TriggerCard({ trigger, onUpdate }: TriggerCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [newName, setNewName] = useState(trigger.name);
    const [isRenaming, setIsRenaming] = useState(false);
    const { startExecution } = useWorkflowStore();

    const getTriggerIcon = () => {
        switch (trigger.trigger_type) {
            case "manual":
                return <Play className="w-5 h-5 text-green-500" />;
            case "schedule":
                return <Calendar className="w-5 h-5 text-blue-500" />;
            case "webhook":
                return <Webhook className="w-5 h-5 text-purple-500" />;
            case "event":
                return <Zap className="w-5 h-5 text-amber-500" />;
            case "file":
                return <FileUp className="w-5 h-5 text-orange-500" />;
            default:
                return <Zap className="w-5 h-5 text-gray-500" />;
        }
    };

    const getConfigDisplay = () => {
        if (trigger.trigger_type === "manual") {
            const config = trigger.config as ManualTriggerConfig;
            const inputCount = config.inputs ? Object.keys(config.inputs).length : 0;
            return (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {inputCount > 0
                                ? `${inputCount} input${inputCount !== 1 ? "s" : ""}`
                                : "No inputs"}
                        </span>
                    </div>
                    {config.description && (
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                </div>
            );
        }

        if (trigger.trigger_type === "schedule") {
            const config = trigger.config as ScheduleTriggerConfig;
            return (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Cron:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {config.cronExpression}
                        </code>
                    </div>
                    {config.timezone && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Timezone:</span>
                            <span className="text-xs">{config.timezone}</span>
                        </div>
                    )}
                </div>
            );
        }

        if (trigger.trigger_type === "webhook") {
            const config = trigger.config as WebhookTriggerConfig;
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Method:</span>
                        <span className="text-xs font-medium">{config.method || "POST"}</span>
                        {config.authType && config.authType !== "none" && (
                            <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                    Auth: {config.authType}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate font-mono">
                            {getWebhookUrl(trigger.id)}
                        </code>
                        <button
                            onClick={copyWebhookUrl}
                            className="p-1.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                            title="Copy webhook URL"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            );
        }

        if (trigger.trigger_type === "file") {
            const config = trigger.config as FileTriggerConfig;
            return (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">File:</span>
                        <span className="text-xs font-medium">
                            {config.fileName || "Uploaded file"}
                        </span>
                    </div>
                    {config.contentType && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Type:</span>
                            <span className="text-xs">{config.contentType}</span>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    const copyWebhookUrl = async () => {
        const url = getWebhookUrl(trigger.id);
        await navigator.clipboard.writeText(url);
        // TODO: Show toast notification
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await deleteTrigger(trigger.id);
            onUpdate();
        } catch (error) {
            console.error("Failed to delete trigger:", error);
            setErrorMessage("Failed to delete trigger");
            setShowErrorDialog(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleEnabled = async () => {
        setIsToggling(true);
        try {
            await updateTrigger(trigger.id, { enabled: !trigger.enabled });
            onUpdate();
        } catch (error) {
            console.error("Failed to toggle trigger:", error);
            setErrorMessage("Failed to update trigger");
            setShowErrorDialog(true);
        } finally {
            setIsToggling(false);
        }
    };

    const handleRenameClick = () => {
        setNewName(trigger.name);
        setShowRenameDialog(true);
    };

    const handleRenameConfirm = async () => {
        if (!newName.trim() || newName === trigger.name) {
            setShowRenameDialog(false);
            return;
        }

        setIsRenaming(true);
        try {
            await updateTrigger(trigger.id, { name: newName.trim() });
            setShowRenameDialog(false);
            onUpdate();
        } catch (error) {
            console.error("Failed to rename trigger:", error);
            setErrorMessage("Failed to rename trigger");
            setShowErrorDialog(true);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleRun = async () => {
        if (!trigger.enabled) {
            setErrorMessage("Please enable the trigger first");
            setShowErrorDialog(true);
            return;
        }

        setIsRunning(true);
        try {
            // For manual triggers, use the stored inputs
            let inputs: Record<string, unknown> | undefined;
            if (trigger.trigger_type === "manual") {
                const config = trigger.config as ManualTriggerConfig;
                inputs = config.inputs;
            } else if (trigger.trigger_type === "file") {
                const config = trigger.config as FileTriggerConfig;
                if (config.base64) {
                    inputs = {
                        fileBase64: config.base64,
                        fileName: config.fileName,
                        contentType: config.contentType
                    };
                }
            }

            const response = await executeTrigger(
                trigger.id,
                inputs as unknown as import("@flowmaestro/shared").JsonObject | undefined
            );

            if (response.success && response.data) {
                // Start execution monitoring in the workflow store
                startExecution(response.data.executionId, trigger.id);

                // Subscribe to WebSocket events for this execution
                wsClient.subscribeToExecution(response.data.executionId);

                // Show success notification
                setSuccessMessage(
                    `Execution started successfully!\nExecution ID: ${response.data.executionId}`
                );
                setShowSuccessDialog(true);
                onUpdate();
            }
        } catch (error) {
            console.error("Failed to execute trigger:", error);
            setErrorMessage(
                "Failed to execute trigger: " +
                    (error instanceof Error ? error.message : String(error))
            );
            setShowErrorDialog(true);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div
            className={cn(
                "border rounded-lg p-3 hover:bg-muted/50 transition-colors relative",
                !trigger.enabled && "opacity-60"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-0.5">{getTriggerIcon()}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{trigger.name}</h4>
                            <span
                                className={cn(
                                    "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                                    trigger.enabled
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                )}
                            >
                                {trigger.enabled ? "Active" : "Disabled"}
                            </span>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-1 w-40 bg-background border border-border rounded-lg shadow-lg z-20 py-1">
                                        <button
                                            onClick={() => {
                                                handleToggleEnabled();
                                                setShowMenu(false);
                                            }}
                                            disabled={isToggling}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                            {trigger.enabled ? (
                                                <>
                                                    <PowerOff className="w-4 h-4" /> Disable
                                                </>
                                            ) : (
                                                <>
                                                    <Power className="w-4 h-4" /> Enable
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleRenameClick();
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleDeleteClick();
                                                setShowMenu(false);
                                            }}
                                            disabled={isDeleting}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Config */}
                    <div className="mb-2">{getConfigDisplay()}</div>

                    {/* Run Button */}
                    <button
                        onClick={handleRun}
                        disabled={!trigger.enabled || isRunning}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mb-2",
                            trigger.enabled
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                        title={!trigger.enabled ? "Enable trigger first" : "Run trigger now"}
                    >
                        <Play className="w-4 h-4" />
                        {isRunning ? "Running..." : "Run Now"}
                    </button>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Triggered {trigger.trigger_count} times</span>
                        {trigger.last_triggered_at && (
                            <span>
                                Last: {new Date(trigger.last_triggered_at).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Trigger"
                message={`Are you sure you want to delete the trigger "${trigger.name}"?`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />

            {/* Error Dialog */}
            <Dialog
                isOpen={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title="Error"
            >
                <p className="text-sm text-gray-700">{errorMessage}</p>
            </Dialog>

            {/* Success Dialog */}
            <Dialog
                isOpen={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                title="Success"
            >
                <p className="text-sm text-gray-700 whitespace-pre-line">{successMessage}</p>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog
                isOpen={showRenameDialog}
                onClose={() => !isRenaming && setShowRenameDialog(false)}
                title="Rename Trigger"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trigger Name
                        </label>
                        <Input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isRenaming) {
                                    handleRenameConfirm();
                                } else if (e.key === "Escape" && !isRenaming) {
                                    setShowRenameDialog(false);
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter trigger name"
                            autoFocus
                            disabled={isRenaming}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowRenameDialog(false)}
                            disabled={isRenaming}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-card border border-gray-300 rounded-md hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRenameConfirm}
                            disabled={isRenaming || !newName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRenaming ? "Renaming..." : "Rename"}
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
