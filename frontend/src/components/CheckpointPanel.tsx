import { X, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "./common/Input";

interface Checkpoint {
    id: string;
    name: string | null;
    createdAt: string;
    formatted?: string;
}

interface CheckpointPanelProps {
    open: boolean;
    onClose: () => void;
    checkpoints: Checkpoint[];
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onCreate: (name?: string) => void;
    onCheckChanges?: () => boolean;
    showMinorChangesDialog?: boolean;
    onShowMinorChangesDialog?: () => void;
    onCloseMinorChangesDialog?: () => void;
}

export function CheckpointPanel({
    open,
    onClose,
    checkpoints,
    onRestore,
    onDelete,
    onRename,
    onCreate,
    onCheckChanges,
    showMinorChangesDialog,
    onShowMinorChangesDialog,
    onCloseMinorChangesDialog
}: CheckpointPanelProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmType, setConfirmType] = useState<"delete" | "restore" | null>(null);
    const [pendingCheckpoint, setPendingCheckpoint] = useState<Checkpoint | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [nameValue, setNameValue] = useState("");

    if (!open) return null;

    const triggerConfirm = (type: "delete" | "restore", checkpoint: Checkpoint) => {
        setConfirmType(type);
        setPendingCheckpoint(checkpoint);
        setShowConfirm(true);
    };

    return (
        <>
            <div
                data-right-panel
                className={`
                    absolute right-0 h-full w-[360px] bg-card border-l border-border shadow-xl z-50
                    transform transition-transform duration-300
                    flex flex-col
                    ${open ? "translate-x-0" : "translate-x-full"}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-lg font-semibold">Checkpoints</h2>

                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Checkpoint History Header */}
                {checkpoints.length > 0 && (
                    <div className="px-4 py-2 border-b border-border bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Saved Checkpoints
                    </div>
                )}

                {/* Content */}
                <div className="p-4 pb-24 overflow-y-auto flex-1">
                    {checkpoints.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No checkpoints yet.
                            <div className="text-xs mt-2">
                                Click "Save Checkpoint" to create your first checkpoint.
                            </div>
                        </div>
                    ) : (
                        <div>
                            {checkpoints.map((cp) => (
                                <div
                                    key={cp.id}
                                    className="p-3 border border-border rounded-lg bg-muted/20 hover:bg-muted/90 mb-2 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerConfirm("restore", cp);
                                    }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gap-1">
                                            {editingId === cp.id ? (
                                                <Input
                                                    autoFocus
                                                    value={editingValue}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>
                                                    ) => setEditingValue(e.target.value)}
                                                    onBlur={() => {
                                                        onRename(cp.id, editingValue);
                                                        setEditingId(null);
                                                    }}
                                                    onKeyDown={(
                                                        e: React.KeyboardEvent<HTMLInputElement>
                                                    ) => {
                                                        if (e.key === "Enter") {
                                                            onRename(cp.id, editingValue);
                                                            setEditingId(null);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingId(null);
                                                        }
                                                    }}
                                                    onClick={(
                                                        e: React.MouseEvent<HTMLInputElement>
                                                    ) => e.stopPropagation()}
                                                    className="text-sm font-medium bg-transparent border-none outline-none focus:bg-muted/50 px-2 py-0.5 rounded transition-colors w-full"
                                                />
                                            ) : (
                                                <span
                                                    className="font-medium cursor-text"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingId(cp.id);
                                                        setEditingValue(cp.name || "");
                                                    }}
                                                >
                                                    {cp.name || "Untitled Checkpoint"}
                                                </span>
                                            )}
                                            <p className="text-xs px-1 py-0.5 rounded bg-muted">
                                                {cp.formatted}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                triggerConfirm("delete", cp);
                                            }}
                                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                                            title="Delete this checkpoint"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Save Checkpoint Button */}
                <div className="absolute bottom-0 w-full p-3 border-t border-border bg-card">
                    <button
                        onClick={() => {
                            // Check for significant changes first
                            const hasSignificantChanges = onCheckChanges?.() ?? true;
                            if (hasSignificantChanges) {
                                setShowNameDialog(true);
                            } else {
                                onShowMinorChangesDialog?.();
                            }
                        }}
                        className="w-full py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors dark:text-black"
                    >
                        Save Checkpoint
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog - Fixed to window center */}
            {showConfirm && pendingCheckpoint && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]"
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className="bg-card p-5 rounded-lg shadow-lg w-[400px] space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {confirmType === "delete" && (
                            <>
                                <p className="text-sm font-medium">Delete this checkpoint?</p>
                                <p className="text-xs text-muted-foreground border-l-2 pl-2">
                                    {pendingCheckpoint.name || "Untitled Checkpoint"}
                                    <br />
                                    {pendingCheckpoint.formatted}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    This action cannot be undone.
                                </p>
                            </>
                        )}

                        {confirmType === "restore" && (
                            <>
                                <p className="text-sm font-medium">Restore this checkpoint?</p>
                                <p className="text-xs text-muted-foreground border-l-2 pl-2">
                                    {pendingCheckpoint.name || "Untitled Checkpoint"}
                                    <br />
                                    {pendingCheckpoint.formatted}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    This will replace the current workflow with this checkpoint.
                                </p>
                            </>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted/70"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    if (confirmType === "delete") onDelete(pendingCheckpoint.id);
                                    if (confirmType === "restore") onRestore(pendingCheckpoint.id);
                                    setShowConfirm(false);
                                }}
                                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 dark:text-black"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Name Dialog - Fixed to window center */}
            {showNameDialog && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]"
                    onClick={() => {
                        setShowNameDialog(false);
                        setNameValue("");
                    }}
                >
                    <div
                        className="bg-card p-5 rounded-lg shadow-lg w-[400px] space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-medium">Name this checkpoint</p>

                        <Input
                            autoFocus
                            value={nameValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setNameValue(e.target.value)
                            }
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Enter") {
                                    setShowNameDialog(false);
                                    onCreate(nameValue || undefined);
                                    setNameValue("");
                                }
                                if (e.key === "Escape") {
                                    setShowNameDialog(false);
                                    setNameValue("");
                                }
                            }}
                            className="text-sm border px-2 py-1 rounded w-full"
                            placeholder="Optional name..."
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowNameDialog(false);
                                    setNameValue("");
                                    onCreate();
                                }}
                                className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted/70"
                            >
                                Skip
                            </button>

                            <button
                                onClick={() => {
                                    setShowNameDialog(false);
                                    onCreate(nameValue || undefined);
                                    setNameValue("");
                                }}
                                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 dark:text-black"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Minor Changes Dialog - Fixed to window center */}
            {showMinorChangesDialog && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]"
                    onClick={onCloseMinorChangesDialog}
                >
                    <div
                        className="bg-card p-5 rounded-lg shadow-lg w-[400px] space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-medium">No structural changes detected</p>

                        <p className="text-xs text-muted-foreground">
                            The current workflow only has minor changes (like node positions)
                            compared to the latest checkpoint. These changes don't typically require
                            a new checkpoint.
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={onCloseMinorChangesDialog}
                                className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted/70"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    onCloseMinorChangesDialog?.();
                                    setShowNameDialog(true);
                                }}
                                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 dark:text-black"
                            >
                                Create Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
