import { useState } from "react";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";

interface CustomMCPServer {
    name: string;
    url: string;
    apiKey?: string;
}

interface AddCustomMCPDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (server: CustomMCPServer) => Promise<void>;
}

export function AddCustomMCPDialog({ isOpen, onClose, onAdd }: AddCustomMCPDialogProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError("Server name is required");
            return;
        }

        if (!url.trim()) {
            setError("Server URL is required");
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError("Please enter a valid URL");
            return;
        }

        setIsAdding(true);
        try {
            await onAdd({
                name: name.trim(),
                url: url.trim(),
                apiKey: apiKey.trim() || undefined
            });

            // Reset form
            setName("");
            setUrl("");
            setApiKey("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add custom MCP server");
        } finally {
            setIsAdding(false);
        }
    };

    const handleClose = () => {
        if (!isAdding) {
            setName("");
            setUrl("");
            setApiKey("");
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Connect Custom MCP Server"
            size="md"
            closeOnBackdropClick={!isAdding}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error */}
                {error && <Alert variant="error">{error}</Alert>}

                {/* Server Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Server Name
                    </label>
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Custom MCP Server"
                        disabled={isAdding}
                    />
                </div>

                {/* Server URL */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Server URL
                    </label>
                    <Input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://mcp.example.com"
                        disabled={isAdding}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        HTTP/HTTPS endpoint where your MCP server is hosted
                    </p>
                </div>

                {/* API Key (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        API Key / Token (optional)
                    </label>
                    <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="••••••••••••••••"
                        disabled={isAdding}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Authentication credentials if required by your server
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={isAdding}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isAdding} loading={isAdding}>
                        {isAdding ? "Connecting..." : "Connect Server"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
