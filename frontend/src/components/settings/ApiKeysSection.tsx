import {
    Plus,
    Key,
    Copy,
    Check,
    MoreVertical,
    Trash2,
    RefreshCw,
    Eye,
    EyeOff,
    AlertCircle,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import {
    getApiKeys,
    getApiKeyScopes,
    createApiKey,
    revokeApiKey,
    rotateApiKey,
    type ApiKey,
    type ApiKeyScope,
    type CreateApiKeyResponse,
    type ApiKeyScopesResponse
} from "../../lib/api";
import { logger } from "../../lib/logger";
import { Badge } from "../common/Badge";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Dialog } from "../common/Dialog";

// Scope display names (compact)
const SCOPE_LABELS: Record<ApiKeyScope, string> = {
    "workflows:read": "Read",
    "workflows:execute": "Execute",
    "executions:read": "Read",
    "executions:cancel": "Cancel",
    "agents:read": "Read",
    "agents:execute": "Execute",
    "threads:read": "Read",
    "threads:write": "Write",
    "triggers:read": "Read",
    "triggers:execute": "Execute",
    "knowledge-bases:read": "Read",
    "knowledge-bases:query": "Query",
    "webhooks:read": "Read",
    "webhooks:write": "Write"
};

// Full scope labels for summary display
const SCOPE_FULL_LABELS: Record<ApiKeyScope, string> = {
    "workflows:read": "Read Workflows",
    "workflows:execute": "Execute Workflows",
    "executions:read": "Read Executions",
    "executions:cancel": "Cancel Executions",
    "agents:read": "Read Agents",
    "agents:execute": "Execute Agents",
    "threads:read": "Read Threads",
    "threads:write": "Write Threads",
    "triggers:read": "Read Triggers",
    "triggers:execute": "Execute Triggers",
    "knowledge-bases:read": "Read Knowledge Bases",
    "knowledge-bases:query": "Query Knowledge Bases",
    "webhooks:read": "Read Webhooks",
    "webhooks:write": "Write Webhooks"
};

// Scope categories for grouping
const SCOPE_CATEGORIES: { name: string; scopes: ApiKeyScope[] }[] = [
    {
        name: "Workflows",
        scopes: ["workflows:read", "workflows:execute"]
    },
    {
        name: "Executions",
        scopes: ["executions:read", "executions:cancel"]
    },
    {
        name: "Agents",
        scopes: ["agents:read", "agents:execute"]
    },
    {
        name: "Threads",
        scopes: ["threads:read", "threads:write"]
    },
    {
        name: "Triggers",
        scopes: ["triggers:read", "triggers:execute"]
    },
    {
        name: "Knowledge",
        scopes: ["knowledge-bases:read", "knowledge-bases:query"]
    },
    {
        name: "Webhooks",
        scopes: ["webhooks:read", "webhooks:write"]
    }
];

export function ApiKeysSection() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [scopesInfo, setScopesInfo] = useState<ApiKeyScopesResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showCreatedDialog, setShowCreatedDialog] = useState(false);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [showRotateDialog, setShowRotateDialog] = useState(false);
    const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<CreateApiKeyResponse | null>(null);

    // Create form state
    const [newKeyName, setNewKeyName] = useState("");
    const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([]);
    const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Action states
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

    useEffect(() => {
        loadApiKeys();
        loadScopes();
    }, []);

    async function loadApiKeys() {
        try {
            setIsLoading(true);
            const response = await getApiKeys();
            setApiKeys(response.data || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load API keys");
        } finally {
            setIsLoading(false);
        }
    }

    async function loadScopes() {
        try {
            const response = await getApiKeyScopes();
            setScopesInfo(response.data ?? null);
        } catch (err) {
            logger.error("Failed to load scopes", err);
        }
    }

    async function handleCreateKey() {
        if (!newKeyName.trim() || selectedScopes.length === 0) return;

        try {
            setIsCreating(true);
            const response = await createApiKey({
                name: newKeyName.trim(),
                scopes: selectedScopes
            });
            if (response.data) {
                setNewlyCreatedKey(response.data);
                setShowCreateDialog(false);
                setShowCreatedDialog(true);
                setNewKeyName("");
                setSelectedScopes([]);
                setSelectedBundle(null);
                await loadApiKeys();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create API key");
        } finally {
            setIsCreating(false);
        }
    }

    async function handleRevokeKey() {
        if (!selectedKey) return;

        try {
            await revokeApiKey(selectedKey.id);
            setShowRevokeDialog(false);
            setSelectedKey(null);
            await loadApiKeys();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to revoke API key");
        }
    }

    async function handleRotateKey() {
        if (!selectedKey) return;

        try {
            const response = await rotateApiKey(selectedKey.id);
            if (response.data) {
                setNewlyCreatedKey(response.data);
                setShowRotateDialog(false);
                setShowCreatedDialog(true);
                setSelectedKey(null);
                await loadApiKeys();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rotate API key");
        }
    }

    function handleBundleSelect(bundleName: string) {
        const bundle = scopesInfo?.bundles.find((b) => b.name === bundleName);
        if (bundle) {
            setSelectedScopes(bundle.scopes);
            setSelectedBundle(bundleName);
        }
    }

    function toggleScope(scope: ApiKeyScope) {
        setSelectedBundle(null);
        setSelectedScopes((prev) =>
            prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
        );
    }

    function copyToClipboard(text: string, keyId?: string) {
        navigator.clipboard.writeText(text);
        if (keyId) {
            setCopiedKeyId(keyId);
            setTimeout(() => setCopiedKeyId(null), 2000);
        }
    }

    function formatDate(dateString: string | null) {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Header with create button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    API keys allow external applications to access your FlowMaestro resources.
                </p>
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex-shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create API Key</span>
                    <span className="sm:hidden">Create Key</span>
                </button>
            </div>

            {/* API Keys List */}
            {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No API keys yet</p>
                    <p className="text-sm">Create your first API key to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border border-border sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <span className="font-medium text-foreground">{key.name}</span>
                                    {!key.is_active && <Badge variant="error">Revoked</Badge>}
                                    {key.expires_at && new Date(key.expires_at) < new Date() && (
                                        <Badge variant="warning">Expired</Badge>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs w-fit">
                                        {key.key_prefix}...
                                    </code>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                                        <span>Created {formatDate(key.created_at)}</span>
                                        <span>Last used {formatDate(key.last_used_at)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {key.scopes.slice(0, 3).map((scope) => (
                                        <Badge key={scope} variant="default" className="text-xs">
                                            {scope}
                                        </Badge>
                                    ))}
                                    {key.scopes.length > 3 && (
                                        <Badge variant="default" className="text-xs">
                                            +{key.scopes.length - 3} more
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Actions dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setActiveDropdown(activeDropdown === key.id ? null : key.id)
                                    }
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {activeDropdown === key.id && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setActiveDropdown(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-20">
                                            <button
                                                onClick={() => {
                                                    copyToClipboard(key.key_prefix, key.id);
                                                    setActiveDropdown(null);
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                                            >
                                                {copiedKeyId === key.id ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                                Copy Prefix
                                            </button>
                                            {key.is_active && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedKey(key);
                                                            setShowRotateDialog(true);
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                        Rotate Key
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedKey(key);
                                                            setShowRevokeDialog(true);
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Revoke Key
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create API Key Dialog */}
            <Dialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                title="Create API Key"
                description="Create a new API key for programmatic access to your FlowMaestro resources."
                size="3xl"
                footer={
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {selectedScopes.length > 0 ? (
                                <span className="text-foreground font-medium">
                                    {selectedScopes.length} permission
                                    {selectedScopes.length !== 1 ? "s" : ""} selected
                                </span>
                            ) : (
                                <span>No permissions selected</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateKey}
                                disabled={
                                    !newKeyName.trim() || selectedScopes.length === 0 || isCreating
                                }
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? "Creating..." : "Create Key"}
                            </button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Name input */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Production API Key"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Scope presets */}
                    {scopesInfo?.bundles && scopesInfo.bundles.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-3">
                                Preset Templates
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {scopesInfo.bundles.map((bundle) => (
                                    <button
                                        key={bundle.name}
                                        onClick={() => handleBundleSelect(bundle.name)}
                                        className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left ${
                                            selectedBundle === bundle.name
                                                ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                                                : "bg-muted/50 border-border hover:border-primary/50 hover:bg-muted"
                                        }`}
                                    >
                                        <span
                                            className={`text-sm font-medium ${
                                                selectedBundle === bundle.name
                                                    ? "text-primary"
                                                    : "text-foreground"
                                            }`}
                                        >
                                            {bundle.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            {bundle.scopes.length} permission
                                            {bundle.scopes.length !== 1 ? "s" : ""}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scope selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-foreground">
                                Permissions
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedScopes(
                                            SCOPE_CATEGORIES.flatMap((c) => c.scopes)
                                        );
                                        setSelectedBundle(null);
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    Select All
                                </button>
                                <span className="text-muted-foreground">|</span>
                                <button
                                    onClick={() => {
                                        setSelectedScopes([]);
                                        setSelectedBundle(null);
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {SCOPE_CATEGORIES.map((category) => (
                                <div
                                    key={category.name}
                                    className="rounded-lg border border-border/50 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/50">
                                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            {category.name}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const allSelected = category.scopes.every((s) =>
                                                    selectedScopes.includes(s)
                                                );
                                                if (allSelected) {
                                                    setSelectedScopes((prev) =>
                                                        prev.filter(
                                                            (s) => !category.scopes.includes(s)
                                                        )
                                                    );
                                                } else {
                                                    setSelectedScopes((prev) => [
                                                        ...new Set([...prev, ...category.scopes])
                                                    ]);
                                                }
                                                setSelectedBundle(null);
                                            }}
                                            className="text-[10px] font-medium text-primary/70 hover:text-primary transition-colors uppercase"
                                        >
                                            {category.scopes.every((s) =>
                                                selectedScopes.includes(s)
                                            )
                                                ? "None"
                                                : "All"}
                                        </button>
                                    </div>
                                    <div className="p-1">
                                        {category.scopes.map((scope) => (
                                            <label
                                                key={scope}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                                    selectedScopes.includes(scope)
                                                        ? "bg-primary/10"
                                                        : "hover:bg-muted/50"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedScopes.includes(scope)}
                                                    onChange={() => toggleScope(scope)}
                                                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary focus:ring-offset-0"
                                                />
                                                <span className="text-xs text-foreground whitespace-nowrap">
                                                    {SCOPE_LABELS[scope]}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected scopes summary */}
                    {selectedScopes.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                Selected Permissions
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedScopes.map((scope) => (
                                    <Badge
                                        key={scope}
                                        variant="default"
                                        className="text-xs cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                                        onClick={() => toggleScope(scope)}
                                    >
                                        {SCOPE_FULL_LABELS[scope]}
                                        <X className="w-3 h-3 ml-1" />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            {/* API Key Created Dialog */}
            <ApiKeyCreatedDialog
                isOpen={showCreatedDialog}
                onClose={() => {
                    setShowCreatedDialog(false);
                    setNewlyCreatedKey(null);
                }}
                apiKey={newlyCreatedKey}
            />

            {/* Revoke Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showRevokeDialog}
                onClose={() => {
                    setShowRevokeDialog(false);
                    setSelectedKey(null);
                }}
                onConfirm={handleRevokeKey}
                title="Revoke API Key"
                message={`Are you sure you want to revoke "${selectedKey?.name}"? This action cannot be undone and any applications using this key will immediately lose access.`}
                confirmText="Revoke Key"
                variant="danger"
            />

            {/* Rotate Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showRotateDialog}
                onClose={() => {
                    setShowRotateDialog(false);
                    setSelectedKey(null);
                }}
                onConfirm={handleRotateKey}
                title="Rotate API Key"
                message={`This will generate a new key and revoke the old one for "${selectedKey?.name}". Make sure to update your applications with the new key.`}
                confirmText="Rotate Key"
                variant="default"
            />
        </div>
    );
}

// Separate component for showing newly created key
function ApiKeyCreatedDialog({
    isOpen,
    onClose,
    apiKey
}: {
    isOpen: boolean;
    onClose: () => void;
    apiKey: CreateApiKeyResponse | null;
}) {
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!apiKey) return null;

    function copyKey() {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="API Key Created"
            size="md"
            closeOnBackdropClick={false}
            footer={
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        Done
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-warning">
                                Save your API key now
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This is the only time you will see the full API key. Store it
                                securely - you won't be able to see it again.
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        API Key
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey.key}
                                readOnly
                                className="w-full px-3 py-2 pr-20 bg-muted border border-border rounded-lg font-mono text-sm"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded"
                            >
                                {showKey ? (
                                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>
                        <button
                            onClick={copyKey}
                            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    <p>
                        <strong>Name:</strong> {apiKey.name}
                    </p>
                    <p className="mt-1">
                        <strong>Prefix:</strong>{" "}
                        <code className="bg-muted px-1 rounded">{apiKey.key_prefix}</code>
                    </p>
                </div>
            </div>
        </Dialog>
    );
}
