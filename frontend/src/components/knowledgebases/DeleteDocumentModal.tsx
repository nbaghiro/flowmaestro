import { Loader2 } from "lucide-react";

interface DeleteDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
}

export function DeleteDocumentModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading
}: DeleteDocumentModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Delete Document</h2>
                <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete this document? This action cannot be undone and
                    will remove all associated chunks and embeddings.
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
                            "Delete"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
