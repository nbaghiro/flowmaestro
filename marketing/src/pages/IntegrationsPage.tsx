import { AnimatePresence, motion } from "framer-motion";
import { Search, Cpu, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import type { Provider } from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { useTheme } from "../hooks/useTheme";
import { IntegrationsPageEvents, SolutionsPageEvents } from "../lib/analytics";

// Get unique categories from providers
const getCategories = (providers: Provider[]): string[] => {
    const categories = new Set(providers.map((p) => p.category));
    return Array.from(categories).sort();
};

interface WorkflowExample {
    id: string;
    screenshotBase: string;
    title: string;
    description: string;
}

const workflowExamples: WorkflowExample[] = [
    {
        id: "lead-enrichment",
        screenshotBase: "workflow-lead-enrichment",
        title: "Lead Enrichment Pipeline",
        description: "Enrich leads with Apollo & LinkedIn, qualify and route to CRM"
    },
    {
        id: "whatsapp-support",
        screenshotBase: "workflow-whatsapp-support",
        title: "WhatsApp Customer Support Bot",
        description:
            "Omnichannel support: WhatsApp/Telegram messages, enrich from HubSpot/Salesforce"
    },
    {
        id: "social-media-hub",
        screenshotBase: "workflow-social-media-hub",
        title: "Social Media Performance Hub",
        description: "Cross-platform analytics: aggregate metrics from TikTok, YouTube, Instagram"
    },
    {
        id: "calendly-meeting-prep",
        screenshotBase: "workflow-calendly-meeting-prep",
        title: "Calendly Meeting Prep",
        description:
            "Lookup attendees in HubSpot/Apollo, research company, generate personalized briefs"
    },
    {
        id: "data-infrastructure",
        screenshotBase: "workflow-data-infrastructure",
        title: "Data Infrastructure Monitor",
        description:
            "Monitor MongoDB/PostgreSQL pipelines, AI anomaly detection, auto-create alerts"
    },
    {
        id: "github-pr-reviewer",
        screenshotBase: "workflow-github-pr-reviewer",
        title: "GitHub PR Reviewer",
        description: "Automated code review: analyze PRs, check for issues, post review comments"
    }
];

interface IntegrationCardProps {
    provider: Provider;
    onIntegrationClick: (name: string, category: string) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ provider, onIntegrationClick }) => {
    const handleClick = () => {
        onIntegrationClick(provider.displayName, provider.category);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-muted-foreground/30 transition-all duration-300 cursor-pointer"
            onClick={handleClick}
        >
            {provider.comingSoon && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                    Soon
                </span>
            )}
            <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-accent transition-colors">
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
                <h3 className="font-medium text-sm mb-1 text-foreground">{provider.displayName}</h3>
                <span className="text-xs text-muted-foreground">{provider.category}</span>
            </div>
        </motion.div>
    );
};

export const IntegrationsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
    const { theme } = useTheme();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const hasTrackedPageView = useRef(false);

    const categories = React.useMemo(() => ["All", ...getCategories(ALL_PROVIDERS)], []);

    // Track page view
    useEffect(() => {
        if (!hasTrackedPageView.current) {
            IntegrationsPageEvents.pageViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    // Track search (debounced)
    useEffect(() => {
        if (!searchQuery) return;
        const timer = setTimeout(() => {
            const resultsCount = ALL_PROVIDERS.filter(
                (p) =>
                    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).length;
            IntegrationsPageEvents.searched({ query: searchQuery, resultsCount });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        if (category !== "All") {
            IntegrationsPageEvents.categoryFiltered({ category });
        }
    };

    const handleIntegrationClick = (integrationName: string, category: string) => {
        IntegrationsPageEvents.integrationClicked({ integrationName, category });
    };

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

    const trackSlideView = useCallback((slideIndex: number) => {
        const example = workflowExamples[slideIndex];
        SolutionsPageEvents.workflowExampleViewed({
            solutionName: "integrations",
            exampleName: example.id
        });
    }, []);

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => {
            const next = (prev + 1) % workflowExamples.length;
            trackSlideView(next);
            return next;
        });
    }, [trackSlideView]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => {
            const next = (prev - 1 + workflowExamples.length) % workflowExamples.length;
            trackSlideView(next);
            return next;
        });
    }, [trackSlideView]);

    const goToSlide = useCallback(
        (index: number) => {
            if (index !== currentSlide) {
                trackSlideView(index);
            }
            setCurrentSlide(index);
        },
        [currentSlide, trackSlideView]
    );

    // Auto-advance carousel
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 5000);

        return () => clearInterval(interval);
    }, [isPaused, nextSlide]);

    const currentExample = workflowExamples[currentSlide];
    const screenshotPath = `/screenshots/${currentExample.screenshotBase}-${theme}.png`;

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-7xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-6">
                                Integrations
                            </p>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                                {totalCount}+ Enterprise
                                <span className="gradient-text"> Integrations</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                                Connect to the tools your team already uses. Every integration
                                automatically becomes MCP tools for your AI agents to use.
                            </p>

                            {/* MCP Tools Feature Callout */}
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-secondary border border-border">
                                <Cpu className="w-5 h-5 text-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    All integrations are auto-wrapped as{" "}
                                    <span className="text-foreground font-medium">MCP Tools</span>{" "}
                                    for AI agents
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Workflow Examples Carousel */}
                <section className="relative py-16 px-4 sm:px-6 lg:px-12 xl:px-16 bg-secondary">
                    <div className="absolute inset-0 grid-pattern opacity-50" />
                    <div className="relative z-10 max-w-[1400px] mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-8"
                        >
                            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
                                See Integrations in Action
                            </h2>
                            <p className="text-muted-foreground">
                                Real workflows connecting multiple integrations
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                        >
                            {/* Carousel Header */}
                            <div className="text-center mb-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h3 className="text-lg font-semibold text-foreground mb-1">
                                            {currentExample.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {currentExample.description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Carousel Container */}
                            <div className="relative">
                                {/* Navigation Arrows */}
                                <button
                                    onClick={prevSlide}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 lg:-translate-x-14 z-20 p-2 sm:p-3 rounded-full bg-card border border-border hover:bg-accent transition-colors shadow-lg"
                                    aria-label="Previous workflow"
                                >
                                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 lg:translate-x-14 z-20 p-2 sm:p-3 rounded-full bg-card border border-border hover:bg-accent transition-colors shadow-lg"
                                    aria-label="Next workflow"
                                >
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                                </button>

                                {/* Screenshot */}
                                <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
                                    <AnimatePresence mode="wait">
                                        <motion.img
                                            key={`${currentSlide}-${theme}`}
                                            src={screenshotPath}
                                            alt={currentExample.title}
                                            className="w-full"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </AnimatePresence>
                                </div>

                                {/* Dot Navigation */}
                                <div className="flex justify-center gap-2 mt-6">
                                    {workflowExamples.map((example, index) => (
                                        <button
                                            key={example.id}
                                            onClick={() => goToSlide(index)}
                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                index === currentSlide
                                                    ? "bg-foreground w-6"
                                                    : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
                                            }`}
                                            aria-label={`Go to ${example.title}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Filters Section */}
                <section className="relative px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search integrations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-muted-foreground transition-colors"
                            />
                        </div>

                        {/* Category Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryChange(category)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        selectedCategory === category
                                            ? "bg-foreground text-background"
                                            : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                                    }`}
                                >
                                    {category}
                                    {category === "All" && (
                                        <span className="ml-2 text-xs opacity-70">
                                            ({totalCount})
                                        </span>
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
                        <p className="text-sm text-muted-foreground mb-6">
                            Showing {sortedProviders.length} integration
                            {sortedProviders.length !== 1 ? "s" : ""}
                            {selectedCategory !== "All" && ` in ${selectedCategory}`}
                        </p>

                        {/* Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {sortedProviders.map((provider) => (
                                <IntegrationCard
                                    key={provider.provider}
                                    provider={provider}
                                    onIntegrationClick={handleIntegrationClick}
                                />
                            ))}
                        </div>

                        {/* Empty state */}
                        {sortedProviders.length === 0 && (
                            <div className="text-center py-16">
                                <p className="text-muted-foreground">
                                    No integrations found matching your search.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
