import { Search, Sparkles } from "lucide-react";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Select } from "../components/common/Select";
import { SkeletonGrid } from "../components/common/SkeletonGrid";
import { PersonaCard } from "../components/personas/cards/PersonaCard";
import { PersonaDetailModal } from "../components/personas/modals/PersonaDetailModal";
import { TaskLaunchDialog } from "../components/personas/modals/TaskLaunchDialog";
import { PersonaCardSkeleton } from "../components/skeletons";
import { PersonaEvents } from "../lib/analytics";
import { getPersona } from "../lib/api";
import { usePersonaStore } from "../stores/personaStore";
import type { PersonaDefinition, PersonaDefinitionSummary, PersonaCategory } from "../lib/api";

const categoryOrder: PersonaCategory[] = [
    "research",
    "content",
    "development",
    "data",
    "operations",
    "business",
    "proposals"
];

const categoryLabels: Record<PersonaCategory, string> = {
    research: "Research & Analysis",
    content: "Content Creation",
    development: "Software Development",
    data: "Data & Analytics",
    operations: "Operations & Support",
    business: "Business Intelligence",
    proposals: "Proposals & Bids"
};

export const Personas: React.FC = () => {
    const navigate = useNavigate();
    const {
        personasByCategory,
        isLoadingPersonas,
        personasError,
        fetchPersonasByCategory,
        needsAttentionCount,
        fetchNeedsAttentionCount
    } = usePersonaStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<PersonaCategory | "all">("all");
    const [_selectedPersonaSummary, setSelectedPersonaSummary] =
        useState<PersonaDefinitionSummary | null>(null);
    const [selectedPersonaFull, setSelectedPersonaFull] = useState<PersonaDefinition | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
    const [isLoadingPersonaDetail, setIsLoadingPersonaDetail] = useState(false);
    const [launchDialogFromDetail, setLaunchDialogFromDetail] = useState(false);
    const hasTrackedPageView = useRef(false);

    // Track page view
    useEffect(() => {
        if (!hasTrackedPageView.current) {
            PersonaEvents.listViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    // Track search with debounce
    useEffect(() => {
        if (!searchQuery) return;
        const timer = setTimeout(() => {
            PersonaEvents.searched({ query: searchQuery });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Track category filter
    useEffect(() => {
        if (selectedCategory !== "all") {
            PersonaEvents.categoryFiltered({ category: selectedCategory });
        }
    }, [selectedCategory]);

    useEffect(() => {
        fetchPersonasByCategory();
        fetchNeedsAttentionCount();
    }, [fetchPersonasByCategory, fetchNeedsAttentionCount]);

    // Filter personas based on search and category
    const filteredCategories = useMemo(() => {
        const result: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
            research: [],
            content: [],
            development: [],
            data: [],
            operations: [],
            business: [],
            proposals: []
        };

        for (const category of categoryOrder) {
            if (selectedCategory !== "all" && selectedCategory !== category) {
                continue;
            }

            const personas = personasByCategory[category] || [];
            const filtered = personas.filter((persona) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                    persona.name.toLowerCase().includes(query) ||
                    persona.description.toLowerCase().includes(query) ||
                    persona.expertise_areas.some((area) => area.toLowerCase().includes(query))
                );
            });

            result[category] = filtered;
        }

        return result;
    }, [personasByCategory, searchQuery, selectedCategory]);

    const handleCardClick = async (persona: PersonaDefinitionSummary) => {
        PersonaEvents.detailsViewed({ personaSlug: persona.slug });
        setSelectedPersonaSummary(persona);
        setIsDetailModalOpen(true);
        setIsLoadingPersonaDetail(true);

        try {
            const response = await getPersona(persona.slug);
            setSelectedPersonaFull(response.data);
        } catch (_error) {
            // Fall back to summary data if full fetch fails
            setSelectedPersonaFull(null);
        } finally {
            setIsLoadingPersonaDetail(false);
        }
    };

    const handleLaunchClick = async (persona: PersonaDefinitionSummary) => {
        PersonaEvents.instanceLaunchInitiated({ personaSlug: persona.slug });
        setSelectedPersonaSummary(persona);
        setIsLoadingPersonaDetail(true);
        setLaunchDialogFromDetail(false);

        try {
            const response = await getPersona(persona.slug);
            setSelectedPersonaFull(response.data);
            setIsLaunchDialogOpen(true);
        } catch (_error) {
            // Can't launch without full persona data
        } finally {
            setIsLoadingPersonaDetail(false);
        }
    };

    const handleDetailModalLaunch = () => {
        setIsDetailModalOpen(false);
        setLaunchDialogFromDetail(true);
        if (selectedPersonaFull) {
            setIsLaunchDialogOpen(true);
        }
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedPersonaSummary(null);
        setSelectedPersonaFull(null);
    };

    const handleCloseLaunchDialog = () => {
        setIsLaunchDialogOpen(false);
        setSelectedPersonaSummary(null);
        setSelectedPersonaFull(null);
    };

    const handleBackFromLaunchDialog = () => {
        setIsLaunchDialogOpen(false);
        setIsDetailModalOpen(true);
    };

    const hasResults = categoryOrder.some((cat) => filteredCategories[cat].length > 0);

    return (
        <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Personas</h1>
                        <p className="text-muted-foreground mt-1">
                            Pre-built AI specialists ready to work on your tasks
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/persona-instances")}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        My Active Tasks
                        {needsAttentionCount > 0 && (
                            <span className="bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-semibold">
                                {needsAttentionCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-3 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search personas..."
                            className="w-full pl-11 pr-4 py-2 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    <Select
                        value={selectedCategory}
                        onChange={(value) => setSelectedCategory(value as PersonaCategory | "all")}
                        options={[
                            { value: "all", label: "All Categories" },
                            ...categoryOrder.map((cat) => ({
                                value: cat,
                                label: categoryLabels[cat]
                            }))
                        ]}
                        className="w-52 whitespace-nowrap"
                    />
                </div>

                {/* Loading State */}
                {isLoadingPersonas && <SkeletonGrid count={6} CardSkeleton={PersonaCardSkeleton} />}

                {/* Error State */}
                {personasError && (
                    <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg mb-8">
                        {personasError}
                    </div>
                )}

                {/* No Results */}
                {!isLoadingPersonas && !personasError && !hasResults && (
                    <div className="text-center py-20">
                        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            No personas found
                        </h3>
                        <p className="text-muted-foreground">
                            {searchQuery
                                ? "Try adjusting your search or filter criteria"
                                : "No personas are available at this time"}
                        </p>
                    </div>
                )}

                {/* Persona Grid by Category */}
                {!isLoadingPersonas &&
                    !personasError &&
                    categoryOrder.map((category) => {
                        const personas = filteredCategories[category];
                        if (personas.length === 0) return null;

                        return (
                            <section key={category} className="mb-10">
                                <h2 className="text-lg font-semibold text-foreground mb-4 uppercase tracking-wide">
                                    {categoryLabels[category]}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {personas.map((persona) => (
                                        <PersonaCard
                                            key={persona.slug}
                                            persona={persona}
                                            onClick={() => handleCardClick(persona)}
                                            onLaunch={() => handleLaunchClick(persona)}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
            </div>

            {/* Detail Modal */}
            {selectedPersonaFull && (
                <PersonaDetailModal
                    persona={selectedPersonaFull}
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    onLaunch={handleDetailModalLaunch}
                />
            )}

            {/* Loading state for detail modal */}
            {isDetailModalOpen && isLoadingPersonaDetail && !selectedPersonaFull && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative bg-card rounded-lg p-8">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                </div>
            )}

            {/* Launch Dialog */}
            {selectedPersonaFull && (
                <TaskLaunchDialog
                    persona={selectedPersonaFull}
                    isOpen={isLaunchDialogOpen}
                    onClose={handleCloseLaunchDialog}
                    onBack={launchDialogFromDetail ? handleBackFromLaunchDialog : undefined}
                />
            )}
        </div>
    );
};
