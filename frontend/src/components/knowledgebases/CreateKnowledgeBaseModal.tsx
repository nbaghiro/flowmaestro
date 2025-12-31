import { useState } from "react";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";

interface CreateKnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description?: string) => Promise<void>;
}

export function CreateKnowledgeBaseModal({
    isOpen,
    onClose,
    onSubmit
}: CreateKnowledgeBaseModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name, description || undefined);
            setName("");
            setDescription("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName("");
        setDescription("");
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Knowledge Base"
            size="md"
            footer={
                <div className="flex items-center gap-3 justify-end">
                    <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        loading={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Knowledge Base"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Description
                    </label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this knowledge base for?"
                        rows={3}
                    />
                </div>
            </div>
        </Dialog>
    );
}
