import { useState } from "react";
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

    if (!isOpen) return null;

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Create Knowledge Base</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Knowledge Base"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this knowledge base for?"
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
