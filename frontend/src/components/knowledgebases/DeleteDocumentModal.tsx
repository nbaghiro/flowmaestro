import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";

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
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Document"
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
                        {isLoading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            }
        >
            <p className="text-muted-foreground">
                Are you sure you want to delete this document? This action cannot be undone and will
                remove all associated chunks and embeddings.
            </p>
        </Dialog>
    );
}
