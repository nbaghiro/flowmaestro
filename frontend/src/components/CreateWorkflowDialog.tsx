import { useQuery } from "@tanstack/react-query";
import {
    Upload,
    FileJson,
    ChevronRight,
    ChevronLeft,
    ArrowRight,
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2,
    Languages,
    ShoppingCart,
    FileStack,
    Route,
    Database,
    ClipboardCheck,
    BookOpen,
    MessageCircle,
    GitPullRequest,
    UserPlus,
    Loader2,
    type LucideIcon
} from "lucide-react";
import { useState, FormEvent, useMemo } from "react";
import {
    getAdvancedPatterns,
    getIntermediatePatterns,
    getAllPatterns,
    type WorkflowPattern,
    type Template,
    type TemplateCategory,
    TEMPLATE_CATEGORY_META,
    ALL_PROVIDERS,
    getProviderLogo
} from "@flowmaestro/shared";
import { getTemplates, getTemplateCategories } from "../lib/api";
import { cn } from "../lib/utils";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Dialog } from "./common/Dialog";
import { Input } from "./common/Input";
import { Select } from "./common/Select";
import { Textarea } from "./common/Textarea";
import { WorkflowCanvasPreview } from "./common/WorkflowCanvasPreview";
import { PatternPicker } from "./PatternPicker";
import type { WorkflowDefinition } from "../lib/api";

// Icon mapping for patterns (same as PatternPicker)
const iconMap: Record<string, LucideIcon> = {
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2,
    Languages,
    ShoppingCart,
    FileStack,
    Route,
    Database,
    ClipboardCheck,
    BookOpen,
    MessageCircle,
    GitPullRequest,
    UserPlus
};

// Get logo URL for an integration - uses shared providers or Brandfetch fallback
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    return getProviderLogo(integration);
};

// Template definition format (React Flow format with nodes as array)
// This is different from WorkflowDefinition which has nodes as an object
interface ReactFlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

interface ReactFlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

interface ReactFlowDefinition {
    name: string;
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
}

/**
 * Checks if the definition has nodes as an array (React Flow format) or object (WorkflowDefinition format).
 */
function isReactFlowFormat(definition: unknown): definition is ReactFlowDefinition {
    if (!definition || typeof definition !== "object") return false;
    const def = definition as { nodes?: unknown };
    return Array.isArray(def.nodes);
}

/**
 * Converts a template definition (React Flow format) to WorkflowDefinition format.
 * Templates store nodes as an array, but the backend expects nodes as an object keyed by ID.
 */
function convertTemplateToWorkflowDefinition(
    definition: unknown,
    workflowName: string
): WorkflowDefinition {
    // If already in WorkflowDefinition format, just update the name
    if (!isReactFlowFormat(definition)) {
        const def = definition as WorkflowDefinition;
        return { ...def, name: workflowName };
    }

    // Convert from React Flow format to WorkflowDefinition format
    const template = definition;

    // Convert nodes array to object keyed by ID
    const nodesObject: WorkflowDefinition["nodes"] = {};

    for (const node of template.nodes) {
        const nodeData = node.data || {};
        // Template nodes use data.label for display name
        const nodeName = (nodeData.label as string) || (nodeData.name as string) || node.type;
        nodesObject[node.id] = {
            type: node.type,
            name: nodeName,
            config: nodeData as WorkflowDefinition["nodes"][string]["config"],
            position: node.position
        };
    }

    // Find the entry point - look for trigger or input nodes, or use first node
    let entryPoint = template.nodes[0]?.id || "";
    for (const node of template.nodes) {
        if (node.type === "trigger" || node.type === "input") {
            entryPoint = node.id;
            break;
        }
    }

    return {
        name: workflowName,
        nodes: nodesObject,
        edges: template.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle
        })),
        entryPoint
    };
}

interface CreateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (
        name: string,
        description?: string,
        definition?: WorkflowDefinition
    ) => Promise<void>;
}

type DialogStep = "pattern" | "details" | "json-import";

export function CreateWorkflowDialog({ isOpen, onClose, onCreate }: CreateWorkflowDialogProps) {
    // Step state
    const [step, setStep] = useState<DialogStep>("pattern");

    // Tab state for pattern selection
    const [activeTab, setActiveTab] = useState<"basic" | "intermediate" | "advanced" | "templates">(
        "basic"
    );

    // Template category filter
    const [templateCategory, setTemplateCategory] = useState<TemplateCategory | null>(null);
    const [templateSearch, setTemplateSearch] = useState("");

    // Get patterns for each tab
    const basicPatterns = useMemo(() => getAllPatterns(), []);
    const intermediatePatterns = useMemo(() => getIntermediatePatterns(), []);
    const advancedPatterns = useMemo(() => getAdvancedPatterns(), []);

    // Fetch templates when templates tab is active
    const { data: templatesData, isLoading: templatesLoading } = useQuery({
        queryKey: ["templates-dialog", templateCategory, templateSearch],
        queryFn: () =>
            getTemplates({
                category: templateCategory || undefined,
                search: templateSearch || undefined,
                limit: 50
            }),
        enabled: isOpen && activeTab === "templates"
    });

    // Fetch template categories
    const { data: categoriesData } = useQuery({
        queryKey: ["template-categories-dialog"],
        queryFn: getTemplateCategories,
        enabled: isOpen && activeTab === "templates"
    });

    // Parse templates
    const templates: Template[] = useMemo(() => {
        if (!templatesData?.data?.items) return [];
        return templatesData.data.items.filter((t: Template) => TEMPLATE_CATEGORY_META[t.category]);
    }, [templatesData]);

    // Parse categories
    const categories = useMemo(() => {
        if (!categoriesData?.data) return [];
        return categoriesData.data.filter(
            (cat: { category: TemplateCategory }) => TEMPLATE_CATEGORY_META[cat.category]
        );
    }, [categoriesData]);

    // Pattern selection state
    const [selectedPattern, setSelectedPattern] = useState<WorkflowPattern | null>(null);

    // Template selection state
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // JSON import state
    const [jsonInput, setJsonInput] = useState("");
    const [parsedWorkflow, setParsedWorkflow] = useState<WorkflowDefinition | null>(null);

    // UI state
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const validateAndParseJSON = (
        json: string
    ): { valid: boolean; data?: WorkflowDefinition; error?: string } => {
        if (!json.trim()) {
            return { valid: true }; // Empty is valid (optional)
        }

        try {
            const parsed = JSON.parse(json);

            // Validate basic structure
            if (!parsed || typeof parsed !== "object") {
                return { valid: false, error: "Invalid JSON: Expected an object" };
            }

            // Check if it has the required workflow structure
            if (!parsed.nodes || typeof parsed.nodes !== "object") {
                return {
                    valid: false,
                    error: "Invalid workflow: Missing 'nodes' property (must be an object)"
                };
            }

            if (!parsed.edges || !Array.isArray(parsed.edges)) {
                return {
                    valid: false,
                    error: "Invalid workflow: Missing or invalid 'edges' property (must be an array)"
                };
            }

            // Validate nodes structure more deeply
            const nodeEntries = Object.entries(parsed.nodes);
            if (nodeEntries.length > 0) {
                for (const [nodeId, node] of nodeEntries) {
                    const nodeObj = node as Record<string, unknown>;
                    if (!nodeObj.type || typeof nodeObj.type !== "string") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing or invalid 'type' property`
                        };
                    }
                    if (!nodeObj.name || typeof nodeObj.name !== "string") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing or invalid 'name' property`
                        };
                    }
                    if (!nodeObj.position || typeof nodeObj.position !== "object") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing 'position' property`
                        };
                    }
                    const position = nodeObj.position as Record<string, unknown>;
                    if (typeof position.x !== "number" || typeof position.y !== "number") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Position must have x and y coordinates`
                        };
                    }
                }
            }

            // Ensure entryPoint exists if there are nodes
            if (nodeEntries.length > 0 && !parsed.entryPoint) {
                return { valid: false, error: "Invalid workflow: Missing 'entryPoint' property" };
            }

            return { valid: true, data: parsed };
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            return {
                valid: false,
                error: `JSON parse error: ${errorObj.message || "Unknown error"}`
            };
        }
    };

    const handleJsonChange = (value: string) => {
        setJsonInput(value);
        setError("");
        setParsedWorkflow(null);

        if (value.trim()) {
            const result = validateAndParseJSON(value);
            if (result.valid && result.data) {
                setParsedWorkflow(result.data);
            } else if (!result.valid && result.error) {
                setError(result.error);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            setError("Please upload a JSON file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            handleJsonChange(content);
        };
        reader.onerror = () => {
            setError("Failed to read file");
        };
        reader.readAsText(file);
    };

    const handlePatternSelect = (pattern: WorkflowPattern) => {
        setSelectedPattern(pattern);
        setSelectedTemplate(null);
        setError("");
    };

    const handleTemplateSelect = (template: Template) => {
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

        // Determine workflow name and definition based on step
        let workflowName: string;
        let workflowDescription: string | undefined;
        let workflowDefinition: WorkflowDefinition | undefined;

        if (step === "json-import") {
            // JSON import mode
            workflowName = parsedWorkflow?.name || name.trim();
            workflowDescription = parsedWorkflow?.description || description.trim() || undefined;

            if (!workflowName) {
                setError("Workflow name is required");
                return;
            }

            if (jsonInput.trim()) {
                const result = validateAndParseJSON(jsonInput);
                if (!result.valid) {
                    setError(result.error || "Invalid JSON");
                    return;
                }
                workflowDefinition = parsedWorkflow || undefined;
            }
        } else {
            // Pattern or template-based creation
            workflowName = name.trim();
            workflowDescription = description.trim() || undefined;

            if (!workflowName) {
                setError("Workflow name is required");
                return;
            }

            if (selectedPattern) {
                // Clone the definition and update the name
                workflowDefinition = {
                    ...selectedPattern.definition,
                    name: workflowName
                };
            } else if (selectedTemplate) {
                // Convert template definition from React Flow format to WorkflowDefinition format
                workflowDefinition = convertTemplateToWorkflowDefinition(
                    selectedTemplate.definition,
                    workflowName
                );
            }
        }

        setIsCreating(true);
        try {
            await onCreate(workflowName, workflowDescription, workflowDefinition);

            // Reset form
            resetForm();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create workflow");
        } finally {
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
        setJsonInput("");
        setParsedWorkflow(null);
        setError("");
    };

    const handleClose = () => {
        if (!isCreating) {
            resetForm();
            onClose();
        }
    };

    const handleBack = () => {
        if (step === "details") {
            setStep("pattern");
            setError("");
        } else if (step === "json-import") {
            setStep("details");
            setJsonInput("");
            setParsedWorkflow(null);
            setError("");
        }
    };

    // Determine dialog title based on step
    const getDialogTitle = () => {
        switch (step) {
            case "pattern":
                return "Create New Workflow";
            case "details":
                return "Name Your Workflow";
            case "json-import":
                return "Import Workflow from JSON";
            default:
                return "Create New Workflow";
        }
    };

    // Determine dialog size based on step
    const getDialogSize = () => {
        return step === "pattern" ? "7xl" : "md";
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={getDialogTitle()}
            size={getDialogSize()}
            closeOnBackdropClick={!isCreating}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Step 1: Pattern Selection */}
                {step === "pattern" && (
                    <div className="flex flex-col">
                        {/* Compact header with tabs and description inline */}
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
                                                "min-w-[6rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                                activeTab === "basic"
                                                    ? "bg-card text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Basic
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("intermediate")}
                                            className={cn(
                                                "min-w-[6rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                                activeTab === "intermediate"
                                                    ? "bg-card text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Intermediate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("advanced")}
                                            className={cn(
                                                "min-w-[6rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
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
                                    : activeTab === "intermediate"
                                      ? intermediatePatterns.length
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
                                                return (
                                                    <div
                                                        key={template.id}
                                                        onClick={() =>
                                                            handleTemplateSelect(template)
                                                        }
                                                        className={cn(
                                                            "bg-card rounded-xl border cursor-pointer overflow-hidden transition-all duration-200",
                                                            isSelected
                                                                ? "border-primary ring-2 ring-primary/20"
                                                                : "border-border hover:border-border/60 hover:shadow-lg"
                                                        )}
                                                    >
                                                        {/* Preview */}
                                                        <div className="h-32 relative overflow-hidden bg-muted/30">
                                                            <WorkflowCanvasPreview
                                                                definition={
                                                                    template.definition as WorkflowDefinition
                                                                }
                                                                height="h-full"
                                                                className="!shadow-none"
                                                            />
                                                            {/* Category badge */}
                                                            <div className="absolute top-2 left-2 z-10">
                                                                <span
                                                                    className={cn(
                                                                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                        category?.color
                                                                    )}
                                                                >
                                                                    {category?.label}
                                                                </span>
                                                            </div>
                                                            {/* Selected indicator */}
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 z-10">
                                                                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                                        <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="p-3">
                                                            {/* Integrations */}
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                {template.required_integrations
                                                                    .slice(0, 4)
                                                                    .map((integration) => (
                                                                        <img
                                                                            key={integration}
                                                                            src={getIntegrationLogo(
                                                                                integration
                                                                            )}
                                                                            alt={integration}
                                                                            title={integration}
                                                                            className="w-4 h-4 object-contain"
                                                                            onError={(e) => {
                                                                                (
                                                                                    e.target as HTMLImageElement
                                                                                ).style.display =
                                                                                    "none";
                                                                            }}
                                                                        />
                                                                    ))}
                                                                {template.required_integrations
                                                                    .length > 4 && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        +
                                                                        {template
                                                                            .required_integrations
                                                                            .length - 4}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Title */}
                                                            <h3 className="font-medium text-sm text-foreground line-clamp-1 mb-1">
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
                                <PatternPicker
                                    patterns={
                                        activeTab === "basic"
                                            ? basicPatterns
                                            : activeTab === "intermediate"
                                              ? intermediatePatterns
                                              : advancedPatterns
                                    }
                                    selectedPatternId={selectedPattern?.id || null}
                                    onSelect={handlePatternSelect}
                                />
                            )}
                        </div>

                        {/* Actions - always visible */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border bg-card">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClose}
                                disabled={isCreating}
                            >
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
                        {selectedPattern &&
                            (() => {
                                const PatternIcon = iconMap[selectedPattern.icon] || Plus;
                                return (
                                    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <PatternIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {selectedPattern.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedPattern.nodeCount} nodes
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                        {/* Selected template indicator */}
                        {selectedTemplate && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                <div className="w-16 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                    <WorkflowCanvasPreview
                                        definition={
                                            selectedTemplate.definition as WorkflowDefinition
                                        }
                                        height="h-full"
                                        className="!shadow-none"
                                    />
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
                                        <span className="text-xs text-muted-foreground">
                                            {selectedTemplate.required_integrations.length}{" "}
                                            integrations
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="workflow-name"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Workflow Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="workflow-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Customer Onboarding Flow"
                                required
                                maxLength={255}
                                disabled={isCreating}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="workflow-description"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Description (optional)
                            </label>
                            <Textarea
                                id="workflow-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this workflow does..."
                                rows={3}
                                maxLength={1000}
                                disabled={isCreating}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {description.length}/1000 characters
                            </p>
                        </div>

                        <div className="border-t border-border pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setStep("json-import")}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <FileJson className="w-4 h-4" />
                                <span>Or import from JSON</span>
                                <ChevronRight className="w-4 h-4 ml-auto" />
                            </Button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleClose}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isCreating || !name.trim()}
                                    loading={isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create Workflow"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: JSON Import */}
                {step === "json-import" && (
                    <>
                        <div className="space-y-3">
                            {/* File Upload */}
                            <div>
                                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                    <Upload className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Upload JSON file
                                    </span>
                                    <Input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        disabled={isCreating}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 border-t border-border"></div>
                                <span className="text-xs text-muted-foreground">OR</span>
                                <div className="flex-1 border-t border-border"></div>
                            </div>

                            {/* JSON Input */}
                            <div>
                                <label
                                    htmlFor="json-input"
                                    className="block text-xs font-medium text-muted-foreground mb-1.5"
                                >
                                    Paste JSON Definition
                                </label>
                                <Textarea
                                    id="json-input"
                                    value={jsonInput}
                                    onChange={(e) => handleJsonChange(e.target.value)}
                                    placeholder={
                                        '{\n  "name": "My Workflow",\n  "nodes": {...},\n  "edges": [...],\n  "entryPoint": "..."\n}'
                                    }
                                    rows={6}
                                    disabled={isCreating}
                                    className="font-mono text-xs"
                                />
                                {parsedWorkflow && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                Valid
                                            </span>
                                            <span>
                                                {Object.keys(parsedWorkflow.nodes || {}).length}{" "}
                                                nodes
                                            </span>
                                            <span>{(parsedWorkflow.edges || []).length} edges</span>
                                        </div>
                                        {parsedWorkflow.name && (
                                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                <p className="text-sm font-medium text-foreground mb-1">
                                                    {parsedWorkflow.name}
                                                </p>
                                                {parsedWorkflow.description && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {parsedWorkflow.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleClose}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isCreating || !parsedWorkflow}
                                    loading={isCreating}
                                >
                                    {isCreating ? "Importing..." : "Import Workflow"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}
