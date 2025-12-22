import { motion } from "framer-motion";
import { Search, Cpu } from "lucide-react";
import React from "react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import type { Provider } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

// Get unique categories from providers
const getCategories = (providers: Provider[]): string[] => {
    const categories = new Set(providers.map((p) => p.category));
    return Array.from(categories).sort();
};

interface IntegrationCardProps {
    provider: Provider;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ provider }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
            {provider.comingSoon && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                    Soon
                </span>
            )}
            <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                    <img
                        src={provider.logoUrl}
                        alt={provider.displayName}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                </div>
                <h3 className="font-medium text-sm mb-1 text-white">{provider.displayName}</h3>
                <span className="text-xs text-gray-500">{provider.category}</span>
            </div>
        </motion.div>
    );
};

export const IntegrationsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

    const categories = React.useMemo(() => ["All", ...getCategories(ALL_PROVIDERS)], []);

    const filteredProviders = React.useMemo(() => {
        return ALL_PROVIDERS.filter((provider) => {
            const matchesSearch =
                searchQuery === "" ||
                provider.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                provider.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                selectedCategory === "All" || provider.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    // Sort: available first, then coming soon
    const sortedProviders = React.useMemo(() => {
        return [...filteredProviders].sort((a, b) => {
            if (a.comingSoon && !b.comingSoon) return 1;
            if (!a.comingSoon && b.comingSoon) return -1;
            return a.displayName.localeCompare(b.displayName);
        });
    }, [filteredProviders]);

    const totalCount = ALL_PROVIDERS.length;

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 grid-pattern opacity-30"></div>
                <div className="relative z-10 max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <p className="text-sm font-medium tracking-widest text-gray-400 uppercase mb-6">
                            Integrations
                        </p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                            {totalCount}+ Enterprise
                            <span className="gradient-text"> Integrations</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                            Connect to the tools your team already uses. Every integration
                            automatically becomes MCP tools for your AI agents to use.
                        </p>

                        {/* MCP Tools Feature Callout */}
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                            <Cpu className="w-5 h-5 text-primary-400" />
                            <span className="text-sm text-gray-300">
                                All integrations are auto-wrapped as{" "}
                                <span className="text-white font-medium">MCP Tools</span> for AI
                                agents
                            </span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Filters Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-8">
                <div className="max-w-7xl mx-auto">
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search integrations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    selectedCategory === category
                                        ? "bg-white text-black"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                {category}
                                {category === "All" && (
                                    <span className="ml-2 text-xs opacity-70">({totalCount})</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Integrations Grid */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
                <div className="max-w-7xl mx-auto">
                    {/* Results count */}
                    <p className="text-sm text-gray-500 mb-6">
                        Showing {sortedProviders.length} integration
                        {sortedProviders.length !== 1 ? "s" : ""}
                        {selectedCategory !== "All" && ` in ${selectedCategory}`}
                    </p>

                    {/* Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {sortedProviders.map((provider) => (
                            <IntegrationCard key={provider.provider} provider={provider} />
                        ))}
                    </div>

                    {/* Empty state */}
                    {sortedProviders.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-gray-400">
                                No integrations found matching your search.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};
