import { useState } from "react";
import { Input } from "../common/Input";

interface AddUrlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (url: string, name?: string) => Promise<void>;
    isLoading: boolean;
}

export function AddUrlModal({ isOpen, onClose, onSubmit, isLoading }: AddUrlModalProps) {
    const [urlInput, setUrlInput] = useState("");
    const [urlNameInput, setUrlNameInput] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!urlInput.trim()) return;
        await onSubmit(urlInput, urlNameInput || undefined);
        setUrlInput("");
        setUrlNameInput("");
    };

    const handleClose = () => {
        setUrlInput("");
        setUrlNameInput("");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Add from URL</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">URL *</label>
                        <Input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com/article"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Name (optional)</label>
                        <Input
                            type="text"
                            value={urlNameInput}
                            onChange={(e) => setUrlNameInput(e.target.value)}
                            placeholder="Article Name"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!urlInput.trim() || isLoading}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Adding..." : "Add URL"}
                    </button>
                </div>
            </div>
        </div>
    );
}
