import { X, Search } from "lucide-react";
import { useState } from "react";
import { ALL_PROVIDERS, type Provider } from "@flowmaestro/shared";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
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
                <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Connect Integration
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Choose a provider to connect to your workflow
                            </p>
                        </div>
                        <Button variant="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="p-6 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
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
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {filteredProviders.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-600">No providers found</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {providersByCategory.map((category) => (
                                    <section key={category.name}>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
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
                </div>
            </div>

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
                    supportsOAuth={selectedProvider.methods.includes("oauth2")}
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
            className="flex items-start gap-3 p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
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
                <h4 className="font-medium text-sm text-gray-900 mb-1 truncate">
                    {provider.displayName}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2">{provider.description}</p>
            </div>
        </button>
    );
}
