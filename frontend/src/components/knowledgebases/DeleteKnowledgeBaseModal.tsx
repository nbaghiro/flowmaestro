import { Loader2 } from "lucide-react";

interface DeleteKnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
    knowledgeBaseName: string;
}

export function DeleteKnowledgeBaseModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    knowledgeBaseName
}: DeleteKnowledgeBaseModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Delete Knowledge Base</h2>
                <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete <strong>{knowledgeBaseName}</strong>? This
                    action cannot be undone and will permanently delete all documents, chunks, and
                    embeddings in this knowledge base.
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Knowledge Base"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
