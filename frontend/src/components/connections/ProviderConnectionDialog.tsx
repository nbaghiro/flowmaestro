import { X, Search, Plus, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { ALL_PROVIDERS, type Provider } from "@flowmaestro/shared";
import { useConnectionStore } from "../../stores/connectionStore";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { NewConnectionDialog } from "./NewConnectionDialog";
import type { Connection } from "../../lib/api";

interface ProviderConnectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedConnectionId?: string;
    defaultCategory?: string;
    excludeCategories?: string[];
    onSelect: (provider: string, connectionId: string) => void;
}

type DialogView = "provider-list" | "connection-list" | "add-connection";

/**
 * Provider Connection Dialog
 * Unified dialog for selecting provider and connection
 */
export function ProviderConnectionDialog({
    isOpen,
    onClose,
    selectedConnectionId,
    defaultCategory,
    excludeCategories = [],
    onSelect
}: ProviderConnectionDialogProps) {
    const [view, setView] = useState<DialogView>("provider-list");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || "all");
    const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
    const { connections, loading, fetchConnections } = useConnectionStore();

    useEffect(() => {
        if (isOpen) {
            fetchConnections();
            setView("provider-list");
            setSearchQuery("");
            setSelectedCategory(defaultCategory || "all");
        }
    }, [isOpen, defaultCategory, fetchConnections]);

    // Filter providers based on search query and category (include all providers, even coming soon)
    const filteredProviders = ALL_PROVIDERS.filter((provider) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            provider.displayName.toLowerCase().includes(query) ||
            provider.description.toLowerCase().includes(query) ||
            provider.category.toLowerCase().includes(query);

        const matchesCategory =
            selectedCategory === "all" || provider.category === selectedCategory;

        const notExcluded = !excludeCategories.includes(provider.category);

        return matchesSearch && matchesCategory && notExcluded;
    });

    // Group providers by category
    const categoryOrder = [
        "AI & ML",
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

    const categories = Array.from(new Set(filteredProviders.map((p) => p.category))).filter(
        (cat) => !excludeCategories.includes(cat)
    );
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
        fetchConnections({ provider: provider.provider });
    };

    const handleConnectionSelect = (connectionId: string) => {
        if (currentProvider) {
            onSelect(currentProvider.provider, connectionId);
            onClose();
        }
    };

    const handleAddNewConnection = () => {
        setView("add-connection");
    };

    const handleBackToProviders = () => {
        setView("provider-list");
        setCurrentProvider(null);
        setSearchQuery("");
    };

    const handleBackToConnections = () => {
        setView("connection-list");
    };

    const handleConnectionCreated = () => {
        setView("connection-list");
        if (currentProvider) {
            fetchConnections({ provider: currentProvider.provider });
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 !m-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Dialog */}
                <div
                    className={`
                        relative bg-card border border-border/50 rounded-lg shadow-xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200
                        ${view === "provider-list" ? "max-w-6xl" : "max-w-2xl"}
                    `}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {view === "provider-list" && "Select Integration Provider"}
                                {view === "connection-list" &&
                                    `Select ${currentProvider?.displayName} Connection`}
                                {view === "add-connection" && "New Connection"}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {view === "provider-list" &&
                                    "Choose a provider to connect to your workflow"}
                                {view === "connection-list" &&
                                    "Select an existing connection or create a new one"}
                                {view === "add-connection" && "Choose an authentication method"}
                            </p>
                        </div>
                        <Button variant="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
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
                                                ...(defaultCategory
                                                    ? []
                                                    : [{ value: "all", label: "All Categories" }]),
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
                                                            const providerConnections =
                                                                connections.filter(
                                                                    (c) =>
                                                                        c.provider ===
                                                                            provider.provider &&
                                                                        c.status === "active"
                                                                );
                                                            const connectionCount =
                                                                providerConnections.length;

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
                                    <div className="flex items-center justify-center py-12">
                                        <p className="text-sm text-muted-foreground">
                                            Loading connections...
                                        </p>
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
                                            to get started
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
                                                    isSelected={
                                                        connection.id === selectedConnectionId
                                                    }
                                                    onSelect={() =>
                                                        handleConnectionSelect(connection.id)
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

                                <button
                                    onClick={handleBackToProviders}
                                    className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                                    type="button"
                                >
                                    ← Back to providers
                                </button>
                            </div>
                        )}

                        {view === "add-connection" && currentProvider && (
                            <div className="p-6">
                                <NewConnectionDialog
                                    isOpen={true}
                                    onClose={handleBackToConnections}
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

                                <button
                                    onClick={handleBackToConnections}
                                    className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                                    type="button"
                                >
                                    ← Back to connections
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Provider Card Component
 */
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
                flex items-start gap-4 p-5 text-left border border-border rounded-xl transition-all
                ${
                    provider.comingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-primary hover:bg-primary/5 hover:shadow-sm"
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
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-500/10 dark:bg-green-400/20 text-green-700 dark:text-green-400 rounded-md">
                            Connected
                        </span>
                    ) : null}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
            </div>
        </button>
    );
}

/**
 * Connection Card Component
 */
interface ConnectionCardProps {
    connection: Connection;
    isSelected: boolean;
    onSelect: () => void;
    providerLogoUrl?: string;
}

function ConnectionCard({
    connection,
    isSelected,
    onSelect,
    providerLogoUrl
}: ConnectionCardProps) {
    const methodLabels: Record<string, string> = {
        oauth2: "OAuth",
        api_key: "API Key",
        mcp: "MCP",
        basic_auth: "Basic Auth",
        custom: "Custom"
    };

    const methodColors: Record<string, string> = {
        oauth2: "bg-purple-500/10 dark:bg-purple-400/20 text-purple-700 dark:text-purple-400",
        api_key: "bg-blue-500/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-400",
        mcp: "bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-400",
        basic_auth: "bg-muted text-muted-foreground",
        custom: "bg-muted text-muted-foreground"
    };

    return (
        <button
            onClick={onSelect}
            className={`
                w-full flex items-start gap-4 p-4 text-left border rounded-lg transition-all
                ${
                    isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-border/60 hover:bg-muted/30"
                }
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

            {/* Selection Indicator */}
            {isSelected && (
                <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                </div>
            )}
        </button>
    );
}
