/**
 * Trigger Provider List Component
 * Displays a searchable list of trigger providers with icons
 */

import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { getProviderLogo } from "@flowmaestro/shared";
import { getTriggerProviders, type TriggerProviderSummary } from "../../lib/api";
import { cn } from "../../lib/utils";

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
    communication: "Communication",
    productivity: "Productivity",
    crm: "CRM & Sales",
    developer_tools: "Developer Tools",
    ecommerce: "E-Commerce",
    file_storage: "File Storage",
    marketing: "Marketing",
    social_media: "Social Media",
    project_management: "Project Management",
    support: "Support",
    database: "Databases",
    payments: "Payments"
};

interface TriggerProviderListProps {
    onSelectProvider: (provider: TriggerProviderSummary) => void;
    selectedCategory?: string;
}

export function TriggerProviderList({
    onSelectProvider,
    selectedCategory
}: TriggerProviderListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const {
        data: providersResponse,
        isLoading,
        error
    } = useQuery({
        queryKey: ["triggerProviders", selectedCategory],
        queryFn: () => getTriggerProviders(selectedCategory),
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    });

    const providers = providersResponse?.data?.providers || [];

    // Filter providers by search query
    const filteredProviders = useMemo(() => {
        if (!searchQuery.trim()) {
            return providers;
        }

        const query = searchQuery.toLowerCase();
        return providers.filter(
            (provider) =>
                provider.name.toLowerCase().includes(query) ||
                provider.description.toLowerCase().includes(query) ||
                provider.category.toLowerCase().includes(query)
        );
    }, [providers, searchQuery]);

    // Group providers by category
    const groupedProviders = useMemo(() => {
        const groups: Record<string, TriggerProviderSummary[]> = {};

        for (const provider of filteredProviders) {
            const category = provider.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(provider);
        }

        // Sort categories
        const sortedCategories = Object.keys(groups).sort((a, b) => {
            const labelA = CATEGORY_LABELS[a] || a;
            const labelB = CATEGORY_LABELS[b] || b;
            return labelA.localeCompare(labelB);
        });

        return sortedCategories.map((category) => ({
            category,
            label: CATEGORY_LABELS[category] || category,
            providers: groups[category]
        }));
    }, [filteredProviders]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                    Failed to load providers. Please try again.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a provider..."
                    className={cn(
                        "w-full pl-10 pr-4 py-2 text-sm",
                        "bg-background border border-border rounded-lg",
                        "placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                />
            </div>

            {/* Provider List */}
            {filteredProviders.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No providers match your search" : "No providers available"}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedProviders.map((group) => (
                        <div key={group.category}>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                {group.label}
                            </h3>
                            <div className="space-y-1">
                                {group.providers.map((provider) => (
                                    <ProviderItem
                                        key={provider.providerId}
                                        provider={provider}
                                        onClick={() => onSelectProvider(provider)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface ProviderItemProps {
    provider: TriggerProviderSummary;
    onClick: () => void;
}

function ProviderItem({ provider, onClick }: ProviderItemProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-3",
                "bg-card hover:bg-muted/50 rounded-lg border border-border",
                "transition-colors cursor-pointer text-left"
            )}
        >
            {/* Provider Icon */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {imageError ? (
                    <span className="text-lg font-semibold text-muted-foreground">
                        {provider.name.charAt(0).toUpperCase()}
                    </span>
                ) : (
                    <img
                        src={getProviderLogo(provider.providerId)}
                        alt={provider.name}
                        className="w-6 h-6 object-contain"
                        onError={() => setImageError(true)}
                    />
                )}
            </div>

            {/* Provider Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{provider.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {provider.eventCount} trigger{provider.eventCount !== 1 ? "s" : ""}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{provider.description}</p>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
    );
}
