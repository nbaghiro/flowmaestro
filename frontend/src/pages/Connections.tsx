import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ALL_PROVIDERS, type Provider } from "@flowmaestro/shared";
import { Input } from "../components/common/Input";
import { PageHeader } from "../components/common/PageHeader";
import { Select } from "../components/common/Select";
import { ConnectionDetailsDialog } from "../components/connections/ConnectionDetailsDialog";
import { NewConnectionDialog } from "../components/connections/NewConnectionDialog";
import { useConnectionStore } from "../stores/connectionStore";
import type { Connection } from "../lib/api";

/**
 * Provider Card Component
 */
interface ProviderCardProps {
    provider: Provider;
    connections: Connection[];
    onConnect: () => void;
    onViewDetails?: (connection: Connection) => void;
}

function ProviderCard({ provider, connections, onConnect, onViewDetails }: ProviderCardProps) {
    const activeConnections = connections.filter((c) => c.status === "active");
    const isConnected = activeConnections.length > 0;
    const connection = activeConnections[0]; // Get the first (and only) connection

    const handleCardClick = () => {
        if (isConnected && connection && onViewDetails) {
            onViewDetails(connection);
        }
    };

    return (
        <div
            onClick={isConnected ? handleCardClick : undefined}
            className={`
                group relative flex items-start gap-4 p-5 bg-card border border-border rounded-xl
                transition-all duration-200
                ${!provider.comingSoon && !isConnected ? "hover:border-primary/50 hover:shadow-sm" : ""}
                ${isConnected ? "hover:border-primary/50 hover:shadow-sm cursor-pointer" : ""}
                ${provider.comingSoon ? "opacity-60" : ""}
            `}
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
                <h3 className="font-medium text-sm text-foreground mb-1 truncate">
                    {provider.displayName}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
            </div>

            {/* Status Badge / Action */}
            <div className="flex-shrink-0">
                {provider.comingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                        Soon
                    </span>
                ) : isConnected ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 rounded-md">
                        Connected
                    </span>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConnect();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Connect
                    </button>
                )}
            </div>
        </div>
    );
}

export function Connections() {
    const { connections, loading, error, fetchConnections, deleteConnectionById } =
        useConnectionStore();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Get connections for a specific provider
    const getConnectionsForProvider = (provider: string) => {
        return connections.filter((c) => c.provider === provider);
    };

    // Group providers by category with custom order (AI & ML first)
    const categoryOrder = [
        "AI & ML",
        "Communication",
        "Productivity",
        "Developer Tools",
        "Project Management",
        "CRM & Sales",
        "E-commerce",
        "Payment Processing",
        "Marketing",
        "Social Media Management",
        "File Storage",
        "Cloud Storage",
        "Social Media",
        "Analytics",
        "Business Intelligence",
        "Accounting",
        "Invoicing & Billing",
        "HR",
        "Customer Support",
        "Design",
        "Databases",
        "ERP",
        "Legal & Contracts",
        "Knowledge Base",
        "Content Management",
        "Scheduling",
        "Forms & Surveys",
        "Video & Webinar",
        "SMS & Messaging",
        "Security & Authentication",
        "Notifications",
        "Call Center",
        "Monitoring & Logging",
        "AB Testing & Optimization",
        "Cryptocurrency"
    ];

    const categories = Array.from(new Set(ALL_PROVIDERS.map((p) => p.category)));

    // Sort categories by custom order
    const sortedCategories = categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);

        // If category not in order list, push to end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });

    // Filter providers based on search query and selected category
    const filteredProviders = ALL_PROVIDERS.filter((provider) => {
        const matchesSearch =
            searchQuery === "" ||
            provider.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
            selectedCategory === "all" || provider.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const providersByCategory = sortedCategories
        .map((category) => ({
            name: category,
            providers: filteredProviders.filter((p) => p.category === category)
        }))
        .filter((category) => category.providers.length > 0);

    const handleConnect = (provider: Provider) => {
        // Check if provider is already connected
        const existingConnections = getConnectionsForProvider(provider.provider);
        const hasActiveConnection = existingConnections.some((c) => c.status === "active");

        // Only allow connection if not already connected
        if (!hasActiveConnection) {
            setSelectedProvider(provider);
            setIsAddDialogOpen(true);
        }
    };

    const handleViewDetails = (connection: Connection) => {
        setSelectedConnection(connection);
        setIsDetailsDialogOpen(true);
    };

    const handleDisconnect = async (connectionId: string) => {
        await deleteConnectionById(connectionId);
        await fetchConnections(); // Refresh the list
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Connections"
                description="Connect to external services to enhance your workflows"
            />

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search integrations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Show results count */}
                    {(searchQuery || selectedCategory !== "all") && (
                        <div className="text-sm text-muted-foreground">
                            Found {filteredProviders.length} integration
                            {filteredProviders.length !== 1 ? "s" : ""}
                        </div>
                    )}

                    {/* Providers grouped by category */}
                    {providersByCategory.length > 0 ? (
                        providersByCategory.map((category) => (
                            <section key={category.name}>
                                <h2 className="text-base font-semibold mb-4 text-foreground">
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {category.providers.map((provider) => (
                                        <ProviderCard
                                            key={provider.provider}
                                            provider={provider}
                                            connections={getConnectionsForProvider(
                                                provider.provider
                                            )}
                                            onConnect={() => handleConnect(provider)}
                                            onViewDetails={handleViewDetails}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-muted-foreground mb-2">No integrations found</p>
                            <p className="text-sm text-muted-foreground">
                                Try adjusting your search or filter criteria
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* New Connection Dialog */}
            {selectedProvider && (
                <NewConnectionDialog
                    isOpen={isAddDialogOpen}
                    onClose={() => {
                        setIsAddDialogOpen(false);
                        setSelectedProvider(null);
                    }}
                    provider={selectedProvider.provider}
                    providerDisplayName={selectedProvider.displayName}
                    providerIcon={
                        <img
                            src={selectedProvider.logoUrl}
                            alt={selectedProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={() => {
                        fetchConnections();
                        setIsAddDialogOpen(false);
                        setSelectedProvider(null);
                    }}
                    supportsOAuth={selectedProvider.methods.includes("oauth2")}
                    supportsApiKey={selectedProvider.methods.includes("api_key")}
                    oauthSettings={selectedProvider.oauthSettings}
                />
            )}

            {/* Connection Details Dialog */}
            {selectedConnection && (
                <ConnectionDetailsDialog
                    isOpen={isDetailsDialogOpen}
                    onClose={() => {
                        setIsDetailsDialogOpen(false);
                        setSelectedConnection(null);
                    }}
                    connection={selectedConnection}
                    providerDisplayName={
                        ALL_PROVIDERS.find((p) => p.provider === selectedConnection.provider)
                            ?.displayName || selectedConnection.provider
                    }
                    providerIcon={
                        <img
                            src={
                                ALL_PROVIDERS.find(
                                    (p) => p.provider === selectedConnection.provider
                                )?.logoUrl || ""
                            }
                            alt={selectedConnection.provider}
                            className="w-12 h-12 object-contain"
                        />
                    }
                    onDisconnect={handleDisconnect}
                />
            )}
        </div>
    );
}
