import { useState, useEffect, FormEvent } from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";

interface CreateWorkspaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({ isOpen, onClose, onSuccess }: CreateWorkspaceDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const { createWorkspace, switchWorkspace } = useWorkspaceStore();

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setName("");
            setDescription("");
            setError("");
        }
    }, [isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Workspace name is required");
            return;
        }

        if (trimmedName.length > 100) {
            setError("Workspace name must be 100 characters or less");
            return;
        }

        setIsSubmitting(true);
        try {
            // New workspaces are always team workspaces (personal workspace is auto-created on signup)
            const workspace = await createWorkspace(
                trimmedName,
                description.trim() || undefined,
                "team"
            );

            // Switch to the new workspace
            await switchWorkspace(workspace.id);

            handleClose();

            if (onSuccess) {
                onSuccess(workspace.id);
            }

            // Reload to refresh data for new workspace
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create workspace");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName("");
            setDescription("");
            setError("");
            onClose();
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Workspace"
            size="sm"
            closeOnBackdropClick={!isSubmitting}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                <div>
                    <label
                        htmlFor="workspace-name"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Workspace Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="workspace-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Marketing Team"
                        required
                        maxLength={100}
                        disabled={isSubmitting}
                        autoFocus
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        {name.length}/100 characters
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="workspace-description"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Description
                    </label>
                    <Textarea
                        id="workspace-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this workspace for? (optional)"
                        rows={3}
                        maxLength={500}
                        disabled={isSubmitting}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        {description.length}/500 characters
                    </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground mb-1">Free Plan Included</p>
                    <ul className="text-muted-foreground space-y-0.5 text-xs">
                        <li>Up to 5 workflows</li>
                        <li>Up to 3 agents</li>
                        <li>100 free credits</li>
                        <li>1 team member (you)</li>
                    </ul>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting || !name.trim()}
                        loading={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create Workspace"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
