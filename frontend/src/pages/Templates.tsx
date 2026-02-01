import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, FileText, AlertCircle, Bot } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Template, TemplateCategory, CategoryInfo, AgentTemplate } from "@flowmaestro/shared";
import { TEMPLATE_CATEGORY_META } from "@flowmaestro/shared";
import { Input } from "../components/common/Input";
import { PageHeader } from "../components/common/PageHeader";
import { Select } from "../components/common/Select";
import { SkeletonGrid } from "../components/common/SkeletonGrid";
import { TemplateCardSkeleton } from "../components/skeletons";
import { AgentTemplateCard } from "../components/templates/cards/AgentTemplateCard";
import { TemplateCard } from "../components/templates/cards/TemplateCard";
import { AgentTemplatePreviewDialog } from "../components/templates/dialogs/AgentTemplatePreviewDialog";
import { TemplatePreviewDialog } from "../components/templates/dialogs/TemplatePreviewDialog";
import { TemplateTypeToggle, type TemplateType } from "../components/templates/TemplateTypeToggle";
import {
    getTemplates,
    getTemplateCategories,
    copyTemplate,
    getAgentTemplates,
    getAgentTemplateCategories,
    copyAgentTemplate
} from "../lib/api";

export function Templates() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State
    const [templateType, setTemplateType] = useState<TemplateType>("workflows");
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
    const [previewAgentTemplate, setPreviewAgentTemplate] = useState<AgentTemplate | null>(null);

    // Fetch workflow categories
    const { data: workflowCategoriesData, isLoading: workflowCategoriesLoading } = useQuery({
        queryKey: ["template-categories"],
        queryFn: getTemplateCategories,
        enabled: templateType === "workflows"
    });

    // Fetch agent categories
    const { data: agentCategoriesData, isLoading: agentCategoriesLoading } = useQuery({
        queryKey: ["agent-template-categories"],
        queryFn: getAgentTemplateCategories,
        enabled: templateType === "agents"
    });

    // Fetch workflow templates
    const {
        data: workflowTemplatesData,
        isLoading: workflowTemplatesLoading,
        error: workflowTemplatesError
    } = useQuery({
        queryKey: ["templates", selectedCategory, searchQuery],
        queryFn: () =>
            getTemplates({
                category: selectedCategory || undefined,
                search: searchQuery || undefined,
                limit: 50
            }),
        enabled: templateType === "workflows"
    });

    // Fetch agent templates
    const {
        data: agentTemplatesData,
        isLoading: agentTemplatesLoading,
        error: agentTemplatesError
    } = useQuery({
        queryKey: ["agent-templates", selectedCategory, searchQuery],
        queryFn: () =>
            getAgentTemplates({
                category: selectedCategory || undefined,
                search: searchQuery || undefined,
                limit: 50
            }),
        enabled: templateType === "agents"
    });

    // Copy workflow template mutation
    const copyWorkflowMutation = useMutation({
        mutationFn: (template: Template) => copyTemplate(template.id),
        onSuccess: (data) => {
            if (data.data?.workflowId) {
                navigate(`/builder/${data.data.workflowId}`);
            }
            queryClient.invalidateQueries({ queryKey: ["templates"] });
        }
    });

    // Copy agent template mutation
    const copyAgentMutation = useMutation({
        mutationFn: (template: AgentTemplate) => copyAgentTemplate(template.id),
        onSuccess: (data) => {
            if (data.data?.agentId) {
                navigate(`/agents/${data.data.agentId}`);
            }
            queryClient.invalidateQueries({ queryKey: ["agent-templates"] });
        }
    });

    // Parse categories with fallback - filter to only known categories
    const categories: CategoryInfo[] = useMemo(() => {
        const data = templateType === "workflows" ? workflowCategoriesData : agentCategoriesData;
        if (!data?.data) return [];
        return data.data.filter((cat: CategoryInfo) => TEMPLATE_CATEGORY_META[cat.category]);
    }, [templateType, workflowCategoriesData, agentCategoriesData]);

    // Parse templates with fallback - filter to only known categories
    const workflowTemplates: Template[] = useMemo(() => {
        if (!workflowTemplatesData?.data?.items) return [];
        return workflowTemplatesData.data.items.filter(
            (t: Template) => TEMPLATE_CATEGORY_META[t.category]
        );
    }, [workflowTemplatesData]);

    const agentTemplates: AgentTemplate[] = useMemo(() => {
        if (!agentTemplatesData?.data?.items) return [];
        return agentTemplatesData.data.items.filter(
            (t: AgentTemplate) => TEMPLATE_CATEGORY_META[t.category]
        );
    }, [agentTemplatesData]);

    // Handlers
    const handleTemplateTypeChange = (type: TemplateType) => {
        setTemplateType(type);
        setSelectedCategory(null);
        setSearchQuery("");
    };

    const handleWorkflowCardClick = (template: Template) => {
        setPreviewTemplate(template);
    };

    const handleAgentCardClick = (template: AgentTemplate) => {
        setPreviewAgentTemplate(template);
    };

    const handleUseWorkflow = async (template: Template) => {
        copyWorkflowMutation.mutate(template);
    };

    const handleUseAgent = async (template: AgentTemplate) => {
        copyAgentMutation.mutate(template);
    };

    const handleCategoryChange = (category: TemplateCategory | null) => {
        setSelectedCategory(category);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const categoriesLoading =
        templateType === "workflows" ? workflowCategoriesLoading : agentCategoriesLoading;
    const templatesLoading =
        templateType === "workflows" ? workflowTemplatesLoading : agentTemplatesLoading;
    const templatesError =
        templateType === "workflows" ? workflowTemplatesError : agentTemplatesError;
    const isLoading = categoriesLoading || templatesLoading;

    const templates = templateType === "workflows" ? workflowTemplates : agentTemplates;
    const templateCount = templates.length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <PageHeader
                title="Templates"
                description="Browse and use pre-built workflow and agent templates to get started quickly"
            />

            {/* Template Type Toggle */}
            <div className="mb-6">
                <TemplateTypeToggle value={templateType} onChange={handleTemplateTypeChange} />
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-8 flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={`Search ${templateType === "workflows" ? "workflow" : "agent"} templates...`}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>

                {/* Category Dropdown */}
                <Select
                    value={selectedCategory || "all"}
                    onChange={(value) =>
                        handleCategoryChange(value === "all" ? null : (value as TemplateCategory))
                    }
                    options={[
                        { value: "all", label: "All Categories" },
                        ...categories.map((cat) => ({
                            value: cat.category,
                            label: `${TEMPLATE_CATEGORY_META[cat.category]?.label || cat.category} (${cat.count})`
                        }))
                    ]}
                    className="sm:w-[200px] sm:flex-shrink-0"
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <SkeletonGrid count={6} CardSkeleton={TemplateCardSkeleton} />
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
            ) : templateCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border dark:border-border rounded-lg bg-muted/30 dark:bg-card">
                    {templateType === "workflows" ? (
                        <FileText className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                    ) : (
                        <Bot className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                    )}
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                        No {templateType === "workflows" ? "workflow" : "agent"} templates found
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center max-w-md">
                        {searchQuery
                            ? `No templates match "${searchQuery}"`
                            : selectedCategory && TEMPLATE_CATEGORY_META[selectedCategory]
                              ? `No templates in the ${TEMPLATE_CATEGORY_META[selectedCategory].label} category`
                              : "No templates available yet"}
                    </p>
                </div>
            ) : (
                <>
                    {/* Results count */}
                    <div className="mb-6 text-sm text-muted-foreground dark:text-muted-foreground">
                        {templateCount} {templateType === "workflows" ? "workflow" : "agent"}{" "}
                        template{templateCount !== 1 ? "s" : ""}
                        {selectedCategory &&
                            TEMPLATE_CATEGORY_META[selectedCategory] &&
                            ` in ${TEMPLATE_CATEGORY_META[selectedCategory].label}`}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </div>

                    {/* Template grid - 3 columns for wider cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templateType === "workflows"
                            ? workflowTemplates.map((template) => (
                                  <TemplateCard
                                      key={template.id}
                                      template={template}
                                      onClick={handleWorkflowCardClick}
                                  />
                              ))
                            : agentTemplates.map((template) => (
                                  <AgentTemplateCard
                                      key={template.id}
                                      template={template}
                                      onClick={handleAgentCardClick}
                                  />
                              ))}
                    </div>
                </>
            )}

            {/* Workflow Preview Dialog */}
            <TemplatePreviewDialog
                template={previewTemplate}
                isOpen={previewTemplate !== null}
                onClose={() => setPreviewTemplate(null)}
                onUse={handleUseWorkflow}
                isUsing={copyWorkflowMutation.isPending}
            />

            {/* Agent Preview Dialog */}
            <AgentTemplatePreviewDialog
                template={previewAgentTemplate}
                isOpen={previewAgentTemplate !== null}
                onClose={() => setPreviewAgentTemplate(null)}
                onUse={handleUseAgent}
                isUsing={copyAgentMutation.isPending}
            />
        </div>
    );
}
