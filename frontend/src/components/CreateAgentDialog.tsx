import { useQuery } from "@tanstack/react-query";
import {
    ChevronLeft,
    ArrowRight,
    Bot,
    Loader2,
    CheckCircle,
    Eye,
    Copy,
    Wrench
} from "lucide-react";
import {
    Plus,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus,
    GitBranch,
    AlertTriangle,
    FileText,
    HeartHandshake,
    type LucideIcon
} from "lucide-react";
import { useState, FormEvent, useMemo, useEffect, useRef } from "react";
import {
    getAdvancedAgentPatterns,
    getAllAgentPatterns,
    getDefaultModelForProvider,
    type AgentPattern,
    type AgentTemplate,
    type TemplateCategory,
    TEMPLATE_CATEGORY_META,
    ALL_PROVIDERS,
    getProviderLogo
} from "@flowmaestro/shared";
import { AgentEvents, DialogEvents } from "../lib/analytics";
import { getAgentTemplates, getAgentTemplateCategories } from "../lib/api";
import { cn } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { AgentPatternPicker } from "./AgentPatternPicker";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Dialog } from "./common/Dialog";
import { Input } from "./common/Input";
import { Select } from "./common/Select";
import { Textarea } from "./common/Textarea";

// Icon mapping (subset for the selected pattern indicator)
const iconMap: Record<string, LucideIcon> = {
    Plus,
    Bot,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus,
    GitBranch,
    AlertTriangle,
    FileText,
    HeartHandshake
};

// Get logo URL for an integration - uses shared providers or Brandfetch fallback
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    return getProviderLogo(integration);
};

export interface AgentPatternData {
    pattern: AgentPattern;
    name: string;
    description?: string;
}

interface CreateAgentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (agentId: string) => void;
}

type DialogStep = "pattern" | "details";

export function CreateAgentDialog({ isOpen, onClose, onCreated }: CreateAgentDialogProps) {
    const { createAgent } = useAgentStore();

    // Step state
    const [step, setStep] = useState<DialogStep>("pattern");

    // Tab state
    const [activeTab, setActiveTab] = useState<"basic" | "advanced" | "templates">("basic");

    // Template category filter
    const [templateCategory, setTemplateCategory] = useState<TemplateCategory | null>(null);
    const [templateSearch, setTemplateSearch] = useState("");

    // Pattern selection state
    const [selectedPattern, setSelectedPattern] = useState<AgentPattern | null>(null);

    // Template selection state
    const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // UI state
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const hasTrackedDialogOpened = useRef(false);

    // Track dialog opened
    useEffect(() => {
        if (isOpen && !hasTrackedDialogOpened.current) {
            DialogEvents.createDialogOpened({ dialogType: "agent" });
            hasTrackedDialogOpened.current = true;
        }
        if (!isOpen) {
            hasTrackedDialogOpened.current = false;
        }
    }, [isOpen]);

    // Get patterns
    const basicPatterns = useMemo(() => getAllAgentPatterns(), []);
    const advancedPatterns = useMemo(() => getAdvancedAgentPatterns(), []);

    // Fetch templates when templates tab is active
    const { data: templatesData, isLoading: templatesLoading } = useQuery({
        queryKey: ["agent-templates-dialog", templateCategory, templateSearch],
        queryFn: () =>
            getAgentTemplates({
                category: templateCategory || undefined,
                search: templateSearch || undefined,
                limit: 50
            }),
        enabled: isOpen && activeTab === "templates"
    });

    // Fetch template categories
    const { data: categoriesData } = useQuery({
        queryKey: ["agent-template-categories-dialog"],
        queryFn: getAgentTemplateCategories,
        enabled: isOpen && activeTab === "templates"
    });

    // Parse templates
    const templates: AgentTemplate[] = useMemo(() => {
        if (!templatesData?.data?.items) return [];
        return templatesData.data.items.filter(
            (t: AgentTemplate) => TEMPLATE_CATEGORY_META[t.category]
        );
    }, [templatesData]);

    // Parse categories
    const categories = useMemo(() => {
        if (!categoriesData?.data) return [];
        return categoriesData.data.filter(
            (cat: { category: TemplateCategory }) => TEMPLATE_CATEGORY_META[cat.category]
        );
    }, [categoriesData]);

    const handlePatternSelect = (pattern: AgentPattern) => {
        setSelectedPattern(pattern);
        setSelectedTemplate(null);
        setError("");
    };

    const handleTemplateSelect = (template: AgentTemplate) => {
        setSelectedTemplate(template);
        setSelectedPattern(null);
        setError("");
    };

    const handlePatternNext = () => {
        if (selectedPattern) {
            // Pre-fill name and description from pattern
            setName(selectedPattern.name);
            setDescription(selectedPattern.description);
            setStep("details");
        } else if (selectedTemplate) {
            // Pre-fill name and description from template
            setName(selectedTemplate.name);
            setDescription(selectedTemplate.description || "");
            setStep("details");
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        const agentName = name.trim();

        if (!agentName) {
            setError("Agent name is required");
            return;
        }

        if (!selectedPattern && !selectedTemplate) {
            setError("Please select a pattern or template");
            return;
        }

        setIsCreating(true);
        try {
            if (selectedPattern) {
                // Create agent with pattern defaults
                const defaultProvider = "openai" as const;
                const defaultModel = getDefaultModelForProvider(defaultProvider);

                const agent = await createAgent({
                    name: agentName,
                    description: description.trim() || undefined,
                    provider: defaultProvider,
                    model: defaultModel,
                    system_prompt: selectedPattern.systemPrompt,
                    temperature: selectedPattern.temperature ?? 0.7,
                    max_tokens: selectedPattern.maxTokens ?? 4096
                });

                // Track agent creation
                AgentEvents.created({
                    agentId: agent.id,
                    provider: defaultProvider,
                    model: defaultModel,
                    toolsCount: 0,
                    templateUsed: selectedPattern.id
                });
                DialogEvents.createItemSubmitted({ dialogType: "agent", itemName: agentName });

                resetForm();
                onCreated(agent.id);
            } else if (selectedTemplate) {
                // Create agent from template
                const agent = await createAgent({
                    name: agentName,
                    description: description.trim() || undefined,
                    provider: selectedTemplate.provider,
                    model: selectedTemplate.model,
                    system_prompt: selectedTemplate.system_prompt,
                    temperature: selectedTemplate.temperature,
                    max_tokens: selectedTemplate.max_tokens
                });

                // Track agent creation from template
                AgentEvents.created({
                    agentId: agent.id,
                    provider: selectedTemplate.provider,
                    model: selectedTemplate.model,
                    toolsCount: 0,
                    templateUsed: selectedTemplate.id
                });
                DialogEvents.createItemSubmitted({ dialogType: "agent", itemName: agentName });

                resetForm();
                onCreated(agent.id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create agent");
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setStep("pattern");
        setActiveTab("basic");
        setSelectedPattern(null);
        setSelectedTemplate(null);
        setTemplateCategory(null);
        setTemplateSearch("");
        setName("");
        setDescription("");
        setError("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleBack = () => {
        if (step === "details") {
            setStep("pattern");
            setError("");
        }
    };

    // Determine dialog title based on step
    const getDialogTitle = () => {
        switch (step) {
            case "pattern":
                return "Create New Agent";
            case "details":
                return "Name Your Agent";
            default:
                return "Create New Agent";
        }
    };

    // Determine dialog size based on step
    const getDialogSize = () => {
        return step === "pattern" ? "7xl" : "md";
    };

    // Get icon for selected pattern
    const SelectedPatternIcon = selectedPattern ? iconMap[selectedPattern.icon] || Bot : Bot;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={getDialogTitle()}
            size={getDialogSize()}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Step 1: Pattern Selection */}
                {step === "pattern" && (
                    <div className="flex flex-col">
                        {/* Compact header with tabs */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                    {activeTab === "templates"
                                        ? "Select a template:"
                                        : "Select a starting pattern:"}
                                </span>
                                <div className="flex items-center gap-3">
                                    {/* Pattern tabs */}
                                    <div className="flex bg-muted rounded-lg p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("basic")}
                                            className={cn(
                                                "min-w-[5rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                                activeTab === "basic"
                                                    ? "bg-card text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Basic
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("advanced")}
                                            className={cn(
                                                "min-w-[5rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                                activeTab === "advanced"
                                                    ? "bg-card text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Advanced
                                        </button>
                                    </div>

                                    {/* Separator */}
                                    <div className="h-6 w-px bg-border" />

                                    {/* Templates tab - separate */}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("templates")}
                                        className={cn(
                                            "px-4 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                            activeTab === "templates"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                        )}
                                    >
                                        Browse Templates
                                    </button>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {activeTab === "basic"
                                    ? basicPatterns.length
                                    : activeTab === "advanced"
                                      ? advancedPatterns.length
                                      : templates.length}{" "}
                                {activeTab === "templates" ? "templates" : "patterns"}
                            </span>
                        </div>

                        {/* Scrollable grid area */}
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            {activeTab === "templates" ? (
                                <>
                                    {/* Category filter and search for templates */}
                                    <div className="flex gap-3 mb-4 sticky top-0 bg-card z-10 pb-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Search templates..."
                                                value={templateSearch}
                                                onChange={(e) => setTemplateSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <Select
                                            value={templateCategory || "all"}
                                            onChange={(value) =>
                                                setTemplateCategory(
                                                    value === "all"
                                                        ? null
                                                        : (value as TemplateCategory)
                                                )
                                            }
                                            options={[
                                                { value: "all", label: "All Categories" },
                                                ...categories.map(
                                                    (cat: {
                                                        category: TemplateCategory;
                                                        count: number;
                                                    }) => ({
                                                        value: cat.category,
                                                        label: `${TEMPLATE_CATEGORY_META[cat.category]?.label || cat.category} (${cat.count})`
                                                    })
                                                )
                                            ]}
                                            className="w-[180px]"
                                        />
                                    </div>

                                    {/* Templates grid */}
                                    {templatesLoading ? (
                                        <div className="flex items-center justify-center min-h-[400px]">
                                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : templates.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                                            <p className="text-muted-foreground">
                                                No templates found
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-4">
                                            {templates.map((template) => {
                                                const category =
                                                    TEMPLATE_CATEGORY_META[template.category];
                                                const isSelected =
                                                    selectedTemplate?.id === template.id;
                                                // Get unique tool providers for display
                                                const toolProviders = template.available_tools
                                                    .filter((tool) => tool.provider)
                                                    .map((tool) => tool.provider!)
                                                    .filter((v, i, arr) => arr.indexOf(v) === i)
                                                    .slice(0, 4);
                                                // Truncate system prompt for preview
                                                const promptPreview = template.system_prompt
                                                    .split("\n")
                                                    .slice(0, 3)
                                                    .join("\n")
                                                    .slice(0, 150);

                                                return (
                                                    <div
                                                        key={template.id}
                                                        onClick={() =>
                                                            handleTemplateSelect(template)
                                                        }
                                                        className={cn(
                                                            "bg-card rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 group",
                                                            isSelected
                                                                ? "border-primary ring-2 ring-primary/20"
                                                                : "border-border hover:border-border/60 hover:shadow-lg hover:scale-[1.02]"
                                                        )}
                                                    >
                                                        {/* Agent Preview Area */}
                                                        <div className="h-36 bg-muted/30 dark:bg-muted relative overflow-hidden">
                                                            {/* Category badge overlay */}
                                                            <div className="absolute top-3 left-3 z-10">
                                                                <span
                                                                    className={cn(
                                                                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                        category?.color
                                                                    )}
                                                                >
                                                                    {category?.label}
                                                                </span>
                                                            </div>

                                                            {/* Model badge */}
                                                            <div className="absolute top-3 right-3 z-10">
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-card/90 text-gray-600 dark:text-gray-300 backdrop-blur-sm">
                                                                    {template.model}
                                                                </span>
                                                            </div>

                                                            {/* System prompt preview */}
                                                            <div className="absolute inset-0 p-3 pt-10 pb-12">
                                                                <div className="text-[10px] text-gray-600 dark:text-muted-foreground font-mono leading-relaxed line-clamp-4">
                                                                    {promptPreview}...
                                                                </div>
                                                            </div>

                                                            {/* AI Provider icon */}
                                                            <div className="absolute bottom-2 right-2 z-10">
                                                                <div className="w-8 h-8 rounded-full bg-card shadow-lg flex items-center justify-center">
                                                                    {template.provider ? (
                                                                        <img
                                                                            src={getProviderLogo(
                                                                                template.provider
                                                                            )}
                                                                            alt={template.provider}
                                                                            className="w-5 h-5 object-contain"
                                                                            onError={(e) => {
                                                                                (
                                                                                    e.target as HTMLImageElement
                                                                                ).style.display =
                                                                                    "none";
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Selected indicator */}
                                                            {isSelected && (
                                                                <div className="absolute bottom-2 left-2 z-10">
                                                                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                                        <CheckCircle className="w-4 h-4 text-primary-foreground" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Hover overlay */}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-card/5 transition-colors pointer-events-none" />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="p-3">
                                                            {/* Header with tools and stats */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    {toolProviders.length > 0 ? (
                                                                        toolProviders.map(
                                                                            (provider) => (
                                                                                <img
                                                                                    key={provider}
                                                                                    src={getIntegrationLogo(
                                                                                        provider
                                                                                    )}
                                                                                    alt={provider}
                                                                                    title={provider}
                                                                                    className="w-4 h-4 object-contain"
                                                                                    onError={(
                                                                                        e
                                                                                    ) => {
                                                                                        (
                                                                                            e.target as HTMLImageElement
                                                                                        ).style.display =
                                                                                            "none";
                                                                                    }}
                                                                                />
                                                                            )
                                                                        )
                                                                    ) : template.available_tools
                                                                          .length > 0 ? (
                                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                            <Wrench className="w-3 h-3" />
                                                                            <span>
                                                                                {
                                                                                    template
                                                                                        .available_tools
                                                                                        .length
                                                                                }{" "}
                                                                                tools
                                                                            </span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                    <span className="flex items-center gap-0.5">
                                                                        <Eye className="w-3 h-3" />
                                                                        {template.view_count}
                                                                    </span>
                                                                    <span className="flex items-center gap-0.5">
                                                                        <Copy className="w-3 h-3" />
                                                                        {template.use_count}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Title */}
                                                            <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
                                                                {template.name}
                                                            </h3>

                                                            {/* Description */}
                                                            {template.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                                    {template.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <AgentPatternPicker
                                    patterns={
                                        activeTab === "basic" ? basicPatterns : advancedPatterns
                                    }
                                    selectedPatternId={selectedPattern?.id || null}
                                    onSelect={handlePatternSelect}
                                />
                            )}
                        </div>

                        {/* Actions - always visible */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border bg-card sticky bottom-0">
                            <Button type="button" variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handlePatternNext}
                                disabled={!selectedPattern && !selectedTemplate}
                                className="gap-2"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Name & Description */}
                {step === "details" && (
                    <>
                        {/* Selected pattern indicator */}
                        {selectedPattern && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <SelectedPatternIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {selectedPattern.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPattern.category} agent
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Selected template indicator */}
                        {selectedTemplate && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {selectedTemplate.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                TEMPLATE_CATEGORY_META[selectedTemplate.category]
                                                    ?.color
                                            )}
                                        >
                                            {
                                                TEMPLATE_CATEGORY_META[selectedTemplate.category]
                                                    ?.label
                                            }
                                        </span>
                                        {selectedTemplate.available_tools?.length > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                {selectedTemplate.available_tools.length} tools
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="agent-name"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Agent Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="agent-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., My Code Assistant"
                                required
                                maxLength={255}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="agent-description"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Description (optional)
                            </label>
                            <Textarea
                                id="agent-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this agent does..."
                                rows={3}
                                maxLength={1000}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {description.length}/1000 characters
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={!name.trim() || isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create Agent"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}
