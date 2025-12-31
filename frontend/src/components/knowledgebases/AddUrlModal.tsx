import { useState } from "react";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
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
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Add from URL"
            size="md"
            closeOnBackdropClick={!isLoading}
            footer={
                <div className="flex items-center gap-3 justify-end">
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!urlInput.trim() || isLoading}
                        loading={isLoading}
                    >
                        {isLoading ? "Adding..." : "Add URL"}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        URL <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/article"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Name (optional)
                    </label>
                    <Input
                        type="text"
                        value={urlNameInput}
                        onChange={(e) => setUrlNameInput(e.target.value)}
                        placeholder="Article Name"
                    />
                </div>
            </div>
        </Dialog>
    );
}
