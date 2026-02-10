import { Loader2 } from "lucide-react";
import type { Provider } from "@flowmaestro/shared";
import { useConnectionStore } from "../../stores/connectionStore";
import type { Connection } from "../../lib/api";

interface ProviderCardProps {
    provider: Provider;
    connections: Connection[];
    onConnect: () => void;
    onViewDetails?: (connection: Connection) => void;
}

function ProviderCard({ provider, connections, onConnect, onViewDetails }: ProviderCardProps) {
    // Only show active connections
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
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate">
                        {provider.displayName}
                    </h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                {isConnected && connection && (
                    <p className="text-xs text-muted-foreground mt-1">{connection.name}</p>
                )}
            </div>

            {/* Status Badge / Action */}
            <div className="flex-shrink-0">
                {provider.comingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                        Soon
                    </span>
                ) : isConnected ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md">
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

interface ConnectionsGridProps {
    providers: Provider[];
    onConnect: (provider: Provider) => void;
    onViewDetails?: (connection: Connection) => void;
    categoryOrder?: string[];
}

export function ConnectionsGrid({
    providers,
    onConnect,
    onViewDetails,
    categoryOrder = [
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
    ]
}: ConnectionsGridProps) {
    const { connections, loading, error } = useConnectionStore();

    // Get connections for a specific provider
    const getConnectionsForProvider = (provider: string) => {
        return connections.filter((c) => c.provider === provider);
    };

    // Group providers by category
    const categories = Array.from(new Set(providers.map((p) => p.category)));

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

    const providersByCategory = sortedCategories.map((category) => ({
        name: category,
        providers: providers.filter((p) => p.category === category)
    }));

    const handleConnect = (provider: Provider) => {
        // Check if provider is already connected
        const existingConnections = getConnectionsForProvider(provider.provider);
        const hasActiveConnection = existingConnections.some((c) => c.status === "active");

        // Only allow connection if not already connected
        if (!hasActiveConnection) {
            onConnect(provider);
        }
    };

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Providers grouped by category */}
            {providersByCategory.map((category) => (
                <section key={category.name}>
                    <h2 className="text-base font-semibold mb-4 text-foreground">
                        {category.name}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.providers.map((provider) => (
                            <ProviderCard
                                key={provider.provider}
                                provider={provider}
                                connections={getConnectionsForProvider(provider.provider)}
                                onConnect={() => handleConnect(provider)}
                                onViewDetails={onViewDetails}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
