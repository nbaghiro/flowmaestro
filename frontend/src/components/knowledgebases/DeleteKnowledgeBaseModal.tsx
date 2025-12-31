import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";

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
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Knowledge Base"
            size="md"
            closeOnBackdropClick={!isLoading}
            footer={
                <div className="flex items-center gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                        loading={isLoading}
                    >
                        {isLoading ? "Deleting..." : "Delete Knowledge Base"}
                    </Button>
                </div>
            }
        >
            <p className="text-muted-foreground">
                Are you sure you want to delete{" "}
                <strong className="text-foreground">{knowledgeBaseName}</strong>? This action cannot
                be undone and will permanently delete all documents, chunks, and embeddings in this
                knowledge base.
            </p>
        </Dialog>
    );
}
