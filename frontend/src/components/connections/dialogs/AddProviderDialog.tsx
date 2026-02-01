import { Search } from "lucide-react";
import { useState } from "react";
import { ALL_PROVIDERS, supportsOAuth, type Provider } from "@flowmaestro/shared";
import { Dialog } from "../../common/Dialog";
import { Input } from "../../common/Input";
import { NewConnectionDialog } from "./NewConnectionDialog";

interface AddProviderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onProviderAdded?: (provider: string) => void;
}

/**
 * Add Provider Dialog
 * Shows all available providers organized by category
 */
export function AddProviderDialog({ isOpen, onClose, onProviderAdded }: AddProviderDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);

    // Filter providers based on search query
    const filteredProviders = ALL_PROVIDERS.filter((provider) => {
        if (provider.comingSoon) return false;
        const query = searchQuery.toLowerCase();
        return (
            provider.displayName.toLowerCase().includes(query) ||
            provider.description.toLowerCase().includes(query) ||
            provider.category.toLowerCase().includes(query)
        );
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

    const handleProviderClick = (provider: Provider) => {
        setSelectedProvider(provider);
        setIsConnectionDialogOpen(true);
    };

    const handleConnectionDialogClose = () => {
        setIsConnectionDialogOpen(false);
        setSelectedProvider(null);
    };

    const handleConnectionSuccess = () => {
        setIsConnectionDialogOpen(false);
        if (selectedProvider && onProviderAdded) {
            onProviderAdded(selectedProvider.provider);
        }
        setSelectedProvider(null);
        onClose();
    };

    return (
        <>
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                title="Connect Integration"
                description="Choose a provider to connect to your workflow"
                size="4xl"
                maxHeight="90vh"
            >
                {/* Search */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            type="text"
                            placeholder="Search providers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[300px]">
                    {filteredProviders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-muted-foreground">No providers found</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {providersByCategory.map((category) => (
                                <section key={category.name}>
                                    <h3 className="text-sm font-semibold text-foreground mb-3">
                                        {category.name}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {category.providers.map((provider) => (
                                            <ProviderCard
                                                key={provider.provider}
                                                provider={provider}
                                                onClick={() => handleProviderClick(provider)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </Dialog>

            {/* New Connection Dialog */}
            {selectedProvider && (
                <NewConnectionDialog
                    isOpen={isConnectionDialogOpen}
                    onClose={handleConnectionDialogClose}
                    provider={selectedProvider.provider}
                    providerDisplayName={selectedProvider.displayName}
                    providerIcon={
                        <img
                            src={selectedProvider.logoUrl}
                            alt={selectedProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={handleConnectionSuccess}
                    supportsOAuth={supportsOAuth(selectedProvider.methods)}
                    supportsApiKey={selectedProvider.methods.includes("api_key")}
                    oauthSettings={selectedProvider.oauthSettings}
                />
            )}
        </>
    );
}

/**
 * Provider Card Component
 */
interface ProviderCardProps {
    provider: Provider;
    onClick: () => void;
}

function ProviderCard({ provider, onClick }: ProviderCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-3 p-4 text-left border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-all bg-card"
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
                <h4 className="font-medium text-sm text-foreground mb-1 truncate">
                    {provider.displayName}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
            </div>
        </button>
    );
}
