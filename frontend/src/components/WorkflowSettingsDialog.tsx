/**
 * Workflow Settings Dialog Component
 * Modal for viewing and editing workflow metadata
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Input } from "./common/Input";
import { Textarea } from "./common/Textarea";

interface WorkflowSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowName: string;
    workflowDescription: string;
    aiGenerated: boolean;
    aiPrompt: string | null;
    onSave: (name: string, description: string) => Promise<void>;
}

export function WorkflowSettingsDialog({
    open,
    onOpenChange,
    workflowName,
    workflowDescription,
    aiGenerated,
    aiPrompt,
    onSave
}: WorkflowSettingsDialogProps) {
    const [name, setName] = useState(workflowName);
    const [description, setDescription] = useState(workflowDescription);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    // Update local state when props change
    useEffect(() => {
        setName(workflowName);
        setDescription(workflowDescription);
        setError("");
    }, [workflowName, workflowDescription, open]);

    const handleSave = async () => {
        setIsSaving(true);
        setError("");

        try {
            await onSave(name, description);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save workflow settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setName(workflowName);
        setDescription(workflowDescription);
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/50 rounded-lg shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 z-50">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                Workflow Settings
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                View and edit workflow metadata
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button variant="icon" aria-label="Close">
                                <X className="w-4 h-4" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        {/* Workflow Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Workflow Name
                            </label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Untitled Workflow"
                                autoFocus
                            />
                        </div>

                        {/* Workflow Description */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a description for this workflow..."
                                rows={3}
                            />
                        </div>

                        {/* AI Generation Info */}
                        {aiGenerated && (
                            <div className="pt-3 border-t border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        AI Generated Workflow
                                    </span>
                                </div>

                                {aiPrompt && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-muted-foreground">
                                            Original Prompt
                                        </label>
                                        <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                                {aiPrompt}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleSave}
                                disabled={isSaving}
                                loading={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
