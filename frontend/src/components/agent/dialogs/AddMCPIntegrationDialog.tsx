import { ArrowLeft, Check, Globe, Plus, Search, Server, X } from "lucide-react";
import { useState, useEffect } from "react";
import { ALL_PROVIDERS, type Provider } from "@flowmaestro/shared";
import { getConnectionMCPTools } from "../../../lib/api";
import { useConnectionStore } from "../../../stores/connectionStore";
import { Alert } from "../../common/Alert";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Select } from "../../common/Select";
import { Spinner } from "../../common/Spinner";
import { NewConnectionDialog } from "../../connections/dialogs/NewConnectionDialog";
import type { Connection, MCPTool, AddToolRequest } from "../../../lib/api";

interface CustomMCPServer {
    name: string;
    url: string;
    apiKey?: string;
}

interface AddMCPIntegrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTools: (tools: AddToolRequest[]) => Promise<void>;
    onAddCustomMCP: (server: CustomMCPServer) => Promise<void>;
    existingToolNames?: string[]; // Names of tools already added to agent
}

type DialogView =
    | "source-choice"
    | "provider-list"
    | "connection-list"
    | "add-connection"
    | "tools"
    | "custom-mcp";

export function AddMCPIntegrationDialog({
    isOpen,
    onClose,
    onAddTools,
    onAddCustomMCP,
    existingToolNames = []
}: AddMCPIntegrationDialogProps) {
    const { connections, loading, fetchConnections } = useConnectionStore();
    const [view, setView] = useState<DialogView>("source-choice");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
    const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
    const [isLoadingTools, setIsLoadingTools] = useState(false);
    const [isAddingTools, setIsAddingTools] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // For creating new connections
    const [isNewConnectionDialogOpen, setIsNewConnectionDialogOpen] = useState(false);

    // Custom MCP server form state
    const [customServerName, setCustomServerName] = useState("");
    const [customServerUrl, setCustomServerUrl] = useState("");
    const [customServerApiKey, setCustomServerApiKey] = useState("");
    const [isAddingCustomServer, setIsAddingCustomServer] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConnections();
            // Reset state when opening
            setView("source-choice");
            setSearchQuery("");
            setSelectedCategory("all");
            setCurrentProvider(null);
            setSelectedConnection(null);
            setAvailableTools([]);
            setSelectedTools(new Set());
            setError(null);
            // Reset custom MCP form
            setCustomServerName("");
            setCustomServerUrl("");
            setCustomServerApiKey("");
        }
    }, [isOpen, fetchConnections]);

    // Categories to exclude (AI/ML providers don't expose MCP tools)
    const excludedCategories = ["AI & ML"];

    // Filter providers based on search query and category (include all providers, even coming soon)
    const filteredProviders = ALL_PROVIDERS.filter((provider) => {
        // Exclude AI/ML category - these are model providers, not integration tools
        if (excludedCategories.includes(provider.category)) return false;

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            provider.displayName.toLowerCase().includes(query) ||
            provider.description.toLowerCase().includes(query) ||
            provider.category.toLowerCase().includes(query);

        const matchesCategory =
            selectedCategory === "all" || provider.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Group providers by category
    const categoryOrder = [
        "Communication",
        "Productivity",
        "Developer Tools",
        "Project Management",
        "CRM & Sales",
        "E-commerce",
        "Marketing",
        "File Storage",
        "Social Media"
    ];

    const categories = Array.from(new Set(filteredProviders.map((p) => p.category)));
    const sortedCategories = categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const providersByCategory = sortedCategories.map((category) => ({
        name: category,
        providers: filteredProviders.filter((p) => p.category === category)
    }));

    // Get connections for selected provider
    const providerConnections = currentProvider
        ? connections.filter(
              (conn) => conn.provider === currentProvider.provider && conn.status === "active"
          )
        : [];

    const handleProviderClick = (provider: Provider) => {
        setCurrentProvider(provider);
        setView("connection-list");
        // Don't fetch with provider filter it replaces all connections in the store
        // We already filter client-side using providerConnections
    };

    const handleConnectionSelect = async (connection: Connection) => {
        setSelectedConnection(connection);
        setIsLoadingTools(true);
        setError(null);

        try {
            const response = await getConnectionMCPTools(connection.id);
            if (response.success && response.data.tools) {
                setAvailableTools(response.data.tools);

                // Pre-select tools that are already added to the agent
                const preselectedTools = new Set<string>();
                response.data.tools.forEach((tool) => {
                    if (existingToolNames.includes(tool.name)) {
                        preselectedTools.add(tool.name);
                    }
                });
                setSelectedTools(preselectedTools);

                setView("tools");
            } else {
                setError("No tools available for this connection");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tools");
        } finally {
            setIsLoadingTools(false);
        }
    };

    const handleAddNewConnection = () => {
        setIsNewConnectionDialogOpen(true);
    };

    const handleBackToSourceChoice = () => {
        setView("source-choice");
        setCurrentProvider(null);
        setSelectedConnection(null);
        setSearchQuery("");
        setSelectedCategory("all");
        setError(null);
        // Reset custom MCP form
        setCustomServerName("");
        setCustomServerUrl("");
        setCustomServerApiKey("");
    };

    const handleBackToProviders = () => {
        setView("provider-list");
        setCurrentProvider(null);
        setSelectedConnection(null);
        setSearchQuery("");
    };

    const handleBackToConnections = () => {
        setView("connection-list");
        setSelectedConnection(null);
        setAvailableTools([]);
        setSelectedTools(new Set());
        setError(null);
    };

    const handleConnectionCreated = () => {
        setIsNewConnectionDialogOpen(false);
        // Refetch all connections not filtered to update the store
        // This ensures LLM connections remain available
        fetchConnections();
    };

    const handleToggleTool = (toolName: string) => {
        setSelectedTools((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(toolName)) {
                newSet.delete(toolName);
            } else {
                newSet.add(toolName);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedTools.size === availableTools.length) {
            setSelectedTools(new Set());
        } else {
            setSelectedTools(new Set(availableTools.map((t) => t.name)));
        }
    };

    const handleAddSelectedTools = async () => {
        if (!selectedConnection || selectedTools.size === 0) return;

        setIsAddingTools(true);
        setError(null);

        try {
            const toolsToAdd: AddToolRequest[] = availableTools
                .filter((tool) => selectedTools.has(tool.name))
                .map((tool) => ({
                    type: "mcp" as const,
                    name: tool.name,
                    description: tool.description,
                    schema: tool.inputSchema,
                    config: {
                        connectionId: selectedConnection.id,
                        provider: selectedConnection.provider
                    }
                }));

            await onAddTools(toolsToAdd);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add tools");
        } finally {
            setIsAddingTools(false);
        }
    };

    const handleCustomMCPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!customServerName.trim()) {
            setError("Server name is required");
            return;
        }

        if (!customServerUrl.trim()) {
            setError("Server URL is required");
            return;
        }

        // Basic URL validation
        try {
            new URL(customServerUrl);
        } catch {
            setError("Please enter a valid URL");
            return;
        }

        setIsAddingCustomServer(true);
        try {
            await onAddCustomMCP({
                name: customServerName.trim(),
                url: customServerUrl.trim(),
                apiKey: customServerApiKey.trim() || undefined
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add custom MCP server");
        } finally {
            setIsAddingCustomServer(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 !m-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Dialog */}
                <div
                    className={`
                        relative bg-card border border-border rounded-lg shadow-xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200
                        ${view === "provider-list" ? "max-w-6xl" : "max-w-2xl"}
                    `}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            {(view === "provider-list" || view === "custom-mcp") && (
                                <Button variant="icon" onClick={handleBackToSourceChoice}>
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            {(view === "connection-list" || view === "tools") && (
                                <Button
                                    variant="icon"
                                    onClick={
                                        view === "tools"
                                            ? handleBackToConnections
                                            : handleBackToProviders
                                    }
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {view === "source-choice" && "Add MCP Integration"}
                                    {view === "provider-list" && "Add Integration Tools"}
                                    {view === "connection-list" &&
                                        `Select ${currentProvider?.displayName} Connection`}
                                    {view === "add-connection" && "New Connection"}
                                    {view === "tools" && `${currentProvider?.displayName} Tools`}
                                    {view === "custom-mcp" && "Connect Custom MCP Server"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {view === "source-choice" &&
                                        "Choose how you want to add MCP tools to your agent"}
                                    {view === "provider-list" &&
                                        "Choose an integration provider to add tools to your agent"}
                                    {view === "connection-list" &&
                                        "Select an existing connection or create a new one"}
                                    {view === "add-connection" && "Choose an authentication method"}
                                    {view === "tools" &&
                                        `${selectedConnection?.name} - Select tools to add`}
                                    {view === "custom-mcp" &&
                                        "Connect to your own MCP server endpoint"}
                                </p>
                            </div>
                        </div>
                        <Button variant="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mx-6 mt-4">
                            <Alert variant="error">{error}</Alert>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {view === "source-choice" && (
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* From Provider Option */}
                                    <button
                                        onClick={() => setView("provider-list")}
                                        className="flex flex-col items-center gap-4 p-6 text-center border border-border rounded-xl transition-all bg-card hover:border-primary/50 hover:bg-accent hover:shadow-sm"
                                        type="button"
                                    >
                                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Globe className="w-7 h-7 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">
                                                From Provider
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Browse and connect to pre-built MCP integrations
                                                from popular services
                                            </p>
                                        </div>
                                    </button>

                                    {/* Custom MCP Server Option */}
                                    <button
                                        onClick={() => setView("custom-mcp")}
                                        className="flex flex-col items-center gap-4 p-6 text-center border border-border rounded-xl transition-all bg-card hover:border-primary/50 hover:bg-accent hover:shadow-sm"
                                        type="button"
                                    >
                                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Server className="w-7 h-7 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">
                                                Custom MCP Server
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Connect to your own MCP server using a custom
                                                endpoint URL
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {view === "provider-list" && (
                            <>
                                {/* Search and Filter Bar */}
                                <div className="p-6 pb-4">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {/* Search Input */}
                                        <div className="relative sm:flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                            <Input
                                                type="text"
                                                placeholder="Search providers..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>

                                        {/* Category Dropdown */}
                                        <Select
                                            value={selectedCategory}
                                            onChange={setSelectedCategory}
                                            options={[
                                                { value: "all", label: "All Categories" },
                                                ...sortedCategories.map((category) => ({
                                                    value: category,
                                                    label: category
                                                }))
                                            ]}
                                            className="sm:w-[240px] sm:flex-shrink-0"
                                        />
                                    </div>
                                </div>

                                {/* Provider List */}
                                <div className="px-6 pb-6">
                                    {filteredProviders.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-muted-foreground">
                                                No providers found
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {providersByCategory.map((category) => (
                                                <section key={category.name}>
                                                    <h3 className="text-base font-semibold text-foreground mb-4">
                                                        {category.name}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {category.providers.map((provider) => {
                                                            const providerConns =
                                                                connections.filter(
                                                                    (c) =>
                                                                        c.provider ===
                                                                            provider.provider &&
                                                                        c.status === "active"
                                                                );
                                                            const connectionCount =
                                                                providerConns.length;

                                                            return (
                                                                <ProviderCard
                                                                    key={provider.provider}
                                                                    provider={provider}
                                                                    connectionCount={
                                                                        connectionCount
                                                                    }
                                                                    onClick={() =>
                                                                        handleProviderClick(
                                                                            provider
                                                                        )
                                                                    }
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {view === "connection-list" && (
                            <div className="p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Spinner size="md" />
                                        <span className="text-sm text-muted-foreground">
                                            Loading connections...
                                        </span>
                                    </div>
                                ) : providerConnections.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            {currentProvider?.logoUrl ? (
                                                <img
                                                    src={currentProvider.logoUrl}
                                                    alt={currentProvider.displayName}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            ) : (
                                                <Plus className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <h3 className="text-base font-medium text-foreground mb-2">
                                            No connections found
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-6">
                                            Create your first{" "}
                                            {currentProvider?.displayName || "provider"} connection
                                            to add tools
                                        </p>
                                        <Button variant="primary" onClick={handleAddNewConnection}>
                                            <Plus className="w-4 h-4" />
                                            Add Connection
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                                            {providerConnections.map((connection) => (
                                                <ConnectionCard
                                                    key={connection.id}
                                                    connection={connection}
                                                    isLoading={
                                                        isLoadingTools &&
                                                        selectedConnection?.id === connection.id
                                                    }
                                                    onSelect={() =>
                                                        handleConnectionSelect(connection)
                                                    }
                                                    providerLogoUrl={currentProvider?.logoUrl}
                                                />
                                            ))}
                                        </div>

                                        <Button
                                            variant="secondary"
                                            onClick={handleAddNewConnection}
                                            className="w-full"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add New Connection
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {view === "tools" && (
                            <div className="p-6">
                                <ToolsList
                                    tools={availableTools}
                                    selectedTools={selectedTools}
                                    onToggle={handleToggleTool}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                        )}

                        {view === "custom-mcp" && (
                            <div className="p-6">
                                <form onSubmit={handleCustomMCPSubmit} className="space-y-4">
                                    {/* Server Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Server Name
                                        </label>
                                        <Input
                                            type="text"
                                            value={customServerName}
                                            onChange={(e) => setCustomServerName(e.target.value)}
                                            placeholder="My Custom MCP Server"
                                            disabled={isAddingCustomServer}
                                        />
                                    </div>

                                    {/* Server URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Server URL
                                        </label>
                                        <Input
                                            type="url"
                                            value={customServerUrl}
                                            onChange={(e) => setCustomServerUrl(e.target.value)}
                                            placeholder="https://mcp.example.com"
                                            disabled={isAddingCustomServer}
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
                                            value={customServerApiKey}
                                            onChange={(e) => setCustomServerApiKey(e.target.value)}
                                            placeholder="••••••••••••••••"
                                            disabled={isAddingCustomServer}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Authentication credentials if required by your server
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-end gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={onClose}
                                            disabled={isAddingCustomServer}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={isAddingCustomServer}
                                            loading={isAddingCustomServer}
                                        >
                                            Connect Server
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Footer for tools view */}
                    {view === "tools" && (
                        <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                            <span className="text-sm text-muted-foreground">
                                {selectedTools.size} of {availableTools.length} tools selected
                            </span>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleAddSelectedTools}
                                    disabled={selectedTools.size === 0 || isAddingTools}
                                    loading={isAddingTools}
                                >
                                    Add Selected ({selectedTools.size})
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Connection Dialog */}
            {currentProvider && (
                <NewConnectionDialog
                    isOpen={isNewConnectionDialogOpen}
                    onClose={() => setIsNewConnectionDialogOpen(false)}
                    provider={currentProvider.provider}
                    providerDisplayName={currentProvider.displayName}
                    providerIcon={
                        <img
                            src={currentProvider.logoUrl}
                            alt={currentProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={handleConnectionCreated}
                    supportsOAuth={currentProvider.methods.includes("oauth2")}
                    supportsApiKey={currentProvider.methods.includes("api_key")}
                    oauthSettings={currentProvider.oauthSettings}
                />
            )}
        </>
    );
}

// Provider Card Component
interface ProviderCardProps {
    provider: Provider;
    connectionCount: number;
    onClick: () => void;
}

function ProviderCard({ provider, connectionCount, onClick }: ProviderCardProps) {
    return (
        <button
            onClick={provider.comingSoon ? undefined : onClick}
            disabled={provider.comingSoon}
            className={`
                flex items-start gap-4 p-5 text-left border border-border rounded-xl transition-all bg-card
                ${
                    provider.comingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-primary/50 hover:bg-accent hover:shadow-sm"
                }
            `}
            type="button"
        >
            {/* Logo */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <img
                    src={provider.logoUrl}
                    alt={`${provider.displayName} logo`}
                    className="w-10 h-10 object-contain"
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate">
                        {provider.displayName}
                    </h4>
                    {provider.comingSoon ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                            Soon
                        </span>
                    ) : connectionCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-900/30 text-green-400 rounded-md">
                            Connected
                        </span>
                    ) : null}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
            </div>
        </button>
    );
}

// Connection Card Component
interface ConnectionCardProps {
    connection: Connection;
    isLoading: boolean;
    onSelect: () => void;
    providerLogoUrl?: string;
}

function ConnectionCard({ connection, isLoading, onSelect, providerLogoUrl }: ConnectionCardProps) {
    const methodLabels: Record<string, string> = {
        oauth2: "OAuth",
        api_key: "API Key",
        mcp: "MCP",
        basic_auth: "Basic Auth",
        custom: "Custom"
    };

    const methodColors: Record<string, string> = {
        oauth2: "bg-purple-900/30 text-purple-400",
        api_key: "bg-blue-900/30 text-blue-400",
        mcp: "bg-indigo-900/30 text-indigo-400",
        basic_auth: "bg-muted text-muted-foreground",
        custom: "bg-muted text-muted-foreground"
    };

    return (
        <button
            onClick={onSelect}
            disabled={isLoading}
            className={`
                w-full flex items-start gap-4 p-4 text-left border rounded-lg transition-all
                border-border hover:border-primary/50 hover:bg-accent
                ${isLoading ? "opacity-50 cursor-wait" : ""}
            `}
            type="button"
        >
            {/* Provider Icon */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {providerLogoUrl ? (
                    <img
                        src={providerLogoUrl}
                        alt="Provider logo"
                        className="w-10 h-10 object-contain"
                    />
                ) : (
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                )}
            </div>

            {/* Connection Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate">
                        {connection.name}
                    </h3>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            methodColors[connection.connection_method] || methodColors.custom
                        }`}
                    >
                        {methodLabels[connection.connection_method] || "Custom"}
                    </span>
                </div>

                {connection.metadata?.account_info?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                        {connection.metadata.account_info.email}
                    </p>
                )}
            </div>

            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex-shrink-0">
                    <Spinner size="sm" />
                </div>
            )}
        </button>
    );
}

// Tools List Component
interface ToolsListProps {
    tools: MCPTool[];
    selectedTools: Set<string>;
    onToggle: (toolName: string) => void;
    onSelectAll: () => void;
}

function ToolsList({ tools, selectedTools, onToggle, onSelectAll }: ToolsListProps) {
    const allSelected = selectedTools.size === tools.length;

    return (
        <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm font-medium text-foreground">Available Tools</span>
                <button
                    onClick={onSelectAll}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                    {allSelected ? "Deselect All" : "Select All"}
                </button>
            </div>

            {/* Tools */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {tools.map((tool) => {
                    const isSelected = selectedTools.has(tool.name);

                    return (
                        <button
                            key={tool.name}
                            onClick={() => onToggle(tool.name)}
                            className={`w-full p-4 border rounded-lg transition-colors text-left flex items-start gap-3 ${
                                isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:bg-accent"
                            }`}
                        >
                            <div
                                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isSelected
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/50"
                                }`}
                            >
                                {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground font-mono text-sm">
                                    {tool.name}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {tool.description}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {tools.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    No tools available for this provider.
                </div>
            )}
        </div>
    );
}
