import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, ArrowRight, GitBranch, Bot, Loader2, AlertCircle, Eye, Copy } from "lucide-react";
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    ALL_PROVIDERS,
    TEMPLATE_CATEGORY_META,
    getProviderLogo as sharedGetProviderLogo
} from "@flowmaestro/shared";
import type {
    Provider,
    TemplateCategory,
    Template,
    AgentTemplate,
    CategoryInfo
} from "@flowmaestro/shared";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { WorkflowCanvasPreview } from "../components/WorkflowCanvasPreview";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import {
    getTemplates,
    getAgentTemplates,
    getTemplateCategories,
    getAgentTemplateCategories
} from "../lib/api";
import { cn } from "../lib/utils";
import type { WorkflowDefinition } from "../components/WorkflowCanvasPreview";

type TemplateType = "workflow" | "agent";

// Get logo URL for an integration
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p: Provider) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    return sharedGetProviderLogo(integration);
};

interface WorkflowCardProps {
    template: Template;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ template }) => {
    const category = TEMPLATE_CATEGORY_META[template.category];
    const appUrl = import.meta.env.VITE_APP_URL || "https://app.flowmaestro.ai";

    if (!category) return null;

    return (
        <a
            href={`${appUrl}/templates`}
            className={cn(
                "block bg-card rounded-xl border border-stroke",
                "hover:shadow-xl hover:border-stroke/60 hover:scale-[1.02]",
                "transition-all duration-200 cursor-pointer overflow-hidden group"
            )}
        >
            {/* React Flow Preview */}
            <div className="h-40 relative overflow-hidden">
                <WorkflowCanvasPreview
                    definition={template.definition as WorkflowDefinition}
                    height="h-full"
                    className="!shadow-none"
                />
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3 z-10">
                    <span
                        className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                            category.color
                        )}
                    >
                        {category.label}
                    </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors pointer-events-none" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with integrations and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {template.required_integrations.slice(0, 4).map((integration) => (
                            <img
                                key={integration}
                                src={getIntegrationLogo(integration)}
                                alt={integration}
                                title={integration}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {template.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {template.use_count}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1.5">
                    {template.name}
                </h3>

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                    </p>
                )}
            </div>
        </a>
    );
};

interface AgentCardProps {
    template: AgentTemplate;
}

const AgentCard: React.FC<AgentCardProps> = ({ template }) => {
    const category = TEMPLATE_CATEGORY_META[template.category];
    const appUrl = import.meta.env.VITE_APP_URL || "https://app.flowmaestro.ai";

    if (!category) return null;

    // Get unique tool providers for display
    const toolProviders = template.available_tools
        .filter((tool) => tool.provider)
        .map((tool) => tool.provider!)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, 4);

    // Truncate system prompt for preview
    const promptPreview = template.system_prompt.split("\n").slice(0, 3).join("\n").slice(0, 150);

    return (
        <a
            href={`${appUrl}/templates`}
            className={cn(
                "block bg-card rounded-xl border border-stroke",
                "hover:shadow-xl hover:border-stroke/60 hover:scale-[1.02]",
                "transition-all duration-200 cursor-pointer overflow-hidden group"
            )}
        >
            {/* Agent Preview Area */}
            <div className="h-40 bg-muted/30 dark:bg-muted relative overflow-hidden">
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3 z-10">
                    <span
                        className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                            category.color
                        )}
                    >
                        {category.label}
                    </span>
                </div>

                {/* Model badge */}
                <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-card/90 text-gray-600 dark:text-gray-300 backdrop-blur-sm">
                        {template.model}
                    </span>
                </div>

                {/* System prompt preview */}
                <div className="absolute inset-0 p-4 pt-12 pb-16">
                    <div className="text-xs text-gray-600 dark:text-muted-foreground font-mono leading-relaxed line-clamp-4">
                        {promptPreview}...
                    </div>
                </div>

                {/* AI Provider icon */}
                <div className="absolute bottom-3 right-3 z-10">
                    <div className="w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center">
                        {template.provider ? (
                            <img
                                src={sharedGetProviderLogo(template.provider)}
                                alt={template.provider}
                                className="w-6 h-6 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ) : (
                            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors pointer-events-none" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with tools and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {toolProviders.length > 0
                            ? toolProviders.map((provider) => (
                                  <img
                                      key={provider}
                                      src={getIntegrationLogo(provider)}
                                      alt={provider}
                                      title={provider}
                                      className="w-5 h-5 object-contain"
                                      onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                  />
                              ))
                            : template.available_tools.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                      {template.available_tools.length} tools
                                  </span>
                              )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {template.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {template.use_count}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1.5">
                    {template.name}
                </h3>

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                    </p>
                )}
            </div>
        </a>
    );
};

const PAGE_SIZE = 24;

export const TemplatesPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [templateType, setTemplateType] = useState<TemplateType>("workflow");
    const [activeCategory, setActiveCategory] = useState<TemplateCategory | null>(null);

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch workflow categories
    const { data: workflowCategoriesData } = useQuery({
        queryKey: ["template-categories"],
        queryFn: getTemplateCategories,
        enabled: templateType === "workflow"
    });

    // Fetch agent categories
    const { data: agentCategoriesData } = useQuery({
        queryKey: ["agent-template-categories"],
        queryFn: getAgentTemplateCategories,
        enabled: templateType === "agent"
    });

    // Fetch workflow templates with infinite scroll
    const {
        data: workflowTemplatesData,
        isLoading: workflowTemplatesLoading,
        error: workflowTemplatesError,
        fetchNextPage: fetchNextWorkflowPage,
        hasNextPage: hasNextWorkflowPage,
        isFetchingNextPage: isFetchingNextWorkflowPage
    } = useInfiniteQuery({
        queryKey: ["templates", activeCategory, debouncedSearch],
        queryFn: ({ pageParam = 0 }) =>
            getTemplates({
                category: activeCategory || undefined,
                search: debouncedSearch || undefined,
                limit: PAGE_SIZE,
                offset: pageParam
            }),
        getNextPageParam: (lastPage) =>
            lastPage.data.hasMore ? lastPage.data.page * lastPage.data.pageSize : undefined,
        initialPageParam: 0,
        enabled: templateType === "workflow"
    });

    // Fetch agent templates with infinite scroll
    const {
        data: agentTemplatesData,
        isLoading: agentTemplatesLoading,
        error: agentTemplatesError,
        fetchNextPage: fetchNextAgentPage,
        hasNextPage: hasNextAgentPage,
        isFetchingNextPage: isFetchingNextAgentPage
    } = useInfiniteQuery({
        queryKey: ["agent-templates", activeCategory, debouncedSearch],
        queryFn: ({ pageParam = 0 }) =>
            getAgentTemplates({
                category: activeCategory || undefined,
                search: debouncedSearch || undefined,
                limit: PAGE_SIZE,
                offset: pageParam
            }),
        getNextPageParam: (lastPage) =>
            lastPage.data.hasMore ? lastPage.data.page * lastPage.data.pageSize : undefined,
        initialPageParam: 0,
        enabled: templateType === "agent"
    });

    // Parse categories with fallback - filter to only known categories
    const categories: CategoryInfo[] = useMemo(() => {
        const data = templateType === "workflow" ? workflowCategoriesData : agentCategoriesData;
        if (!data?.data) return [];
        return data.data.filter((cat: CategoryInfo) => TEMPLATE_CATEGORY_META[cat.category]);
    }, [templateType, workflowCategoriesData, agentCategoriesData]);

    // Parse templates by flattening paginated data - filter to only known categories
    const workflowTemplates: Template[] = useMemo(() => {
        if (!workflowTemplatesData?.pages) return [];
        return workflowTemplatesData.pages
            .flatMap((page) => page.data.items)
            .filter((t: Template) => TEMPLATE_CATEGORY_META[t.category]);
    }, [workflowTemplatesData]);

    const agentTemplates: AgentTemplate[] = useMemo(() => {
        if (!agentTemplatesData?.pages) return [];
        return agentTemplatesData.pages
            .flatMap((page) => page.data.items)
            .filter((t: AgentTemplate) => TEMPLATE_CATEGORY_META[t.category]);
    }, [agentTemplatesData]);

    // Get total count from the first page
    const workflowTemplatesTotal = workflowTemplatesData?.pages?.[0]?.data?.total ?? 0;
    const agentTemplatesTotal = agentTemplatesData?.pages?.[0]?.data?.total ?? 0;

    const templatesLoading =
        templateType === "workflow" ? workflowTemplatesLoading : agentTemplatesLoading;
    const templatesError =
        templateType === "workflow" ? workflowTemplatesError : agentTemplatesError;
    const templateTotal =
        templateType === "workflow" ? workflowTemplatesTotal : agentTemplatesTotal;
    const isFetchingNextPage =
        templateType === "workflow" ? isFetchingNextWorkflowPage : isFetchingNextAgentPage;
    const hasNextPage = templateType === "workflow" ? hasNextWorkflowPage : hasNextAgentPage;
    const fetchNextPage = templateType === "workflow" ? fetchNextWorkflowPage : fetchNextAgentPage;

    // Infinite scroll hook
    const sentinelRef = useInfiniteScroll({
        onLoadMore: fetchNextPage,
        hasMore: hasNextPage ?? false,
        isLoading: isFetchingNextPage
    });

    // Reset category when switching template type
    const handleTypeChange = (type: TemplateType) => {
        setTemplateType(type);
        setActiveCategory(null);
        setSearchQuery("");
        setDebouncedSearch("");
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-12 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                {templateType === "workflow" ? "Workflow" : "Agent"}{" "}
                                <span className="gradient-text">Templates</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                                Get started with pre-built automation templates. Clone, customize,
                                and deploy in minutes.
                            </p>

                            {/* Search */}
                            <div className="relative max-w-xl mx-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={`Search ${templateType} templates...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-card border border-stroke rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Type Toggle */}
                <section className="py-4 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-center">
                            <div className="inline-flex bg-card border border-stroke rounded-lg p-1">
                                <button
                                    onClick={() => handleTypeChange("workflow")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                        templateType === "workflow"
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <GitBranch className="w-4 h-4" />
                                    Workflows
                                </button>
                                <button
                                    onClick={() => handleTypeChange("agent")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                        templateType === "agent"
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Bot className="w-4 h-4" />
                                    Agents
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Category Filter */}
                <section className="py-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => setActiveCategory(null)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeCategory === null
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card border border-stroke text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                All Categories
                            </button>
                            {categories.map((category) => {
                                const meta = TEMPLATE_CATEGORY_META[category.category];
                                return (
                                    <button
                                        key={category.category}
                                        onClick={() => setActiveCategory(category.category)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            activeCategory === category.category
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-card border border-stroke text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {meta?.label || category.category} ({category.count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Templates Grid */}
                <section className="py-8 pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        {templatesLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                <p className="text-muted-foreground">Loading templates...</p>
                            </div>
                        ) : templatesError ? (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                                    Failed to load templates
                                </h3>
                                <p className="text-sm text-red-600 dark:text-red-300 text-center max-w-md">
                                    {templatesError instanceof Error
                                        ? templatesError.message
                                        : "An error occurred"}
                                </p>
                            </div>
                        ) : templateTotal === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <p className="text-muted-foreground mb-4">
                                    No templates found
                                    {debouncedSearch && ` for "${debouncedSearch}"`}
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setDebouncedSearch("");
                                        setActiveCategory(null);
                                    }}
                                    className="text-primary hover:underline"
                                >
                                    Clear filters
                                </button>
                            </motion.div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-muted-foreground">
                                        {templateTotal}{" "}
                                        {templateType === "workflow" ? "workflow" : "agent"}{" "}
                                        template{templateTotal !== 1 ? "s" : ""}
                                        {activeCategory &&
                                            ` in ${TEMPLATE_CATEGORY_META[activeCategory]?.label || activeCategory}`}
                                    </p>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templateType === "workflow"
                                        ? workflowTemplates.map((template) => (
                                              <WorkflowCard key={template.id} template={template} />
                                          ))
                                        : agentTemplates.map((template) => (
                                              <AgentCard key={template.id} template={template} />
                                          ))}
                                </div>

                                {/* Infinite scroll sentinel */}
                                <div
                                    ref={sentinelRef}
                                    className="h-10 flex items-center justify-center mt-6"
                                >
                                    {isFetchingNextPage && (
                                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Custom Workflow CTA */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-3xl font-bold mb-4">
                                Need a Custom {templateType === "workflow" ? "Workflow" : "Agent"}?
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Can't find what you're looking for? Build your own custom{" "}
                                {templateType === "workflow" ? "workflow" : "agent"} from scratch or
                                talk to our team about your specific needs.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href={
                                        import.meta.env.VITE_APP_URL || "https://app.flowmaestro.ai"
                                    }
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    Build Custom{" "}
                                    {templateType === "workflow" ? "Workflow" : "Agent"}
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                                <Link
                                    to="/contact"
                                    className="btn-secondary inline-flex items-center justify-center"
                                >
                                    Talk to Sales
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
