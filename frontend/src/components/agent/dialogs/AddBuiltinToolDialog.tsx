import { Check, Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getBuiltinTools } from "../../../lib/api";
import { Alert } from "../../common/Alert";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Select } from "../../common/Select";
import { Spinner } from "../../common/Spinner";
import type { BuiltinTool, AddToolRequest } from "../../../lib/api";

interface AddBuiltinToolDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTools: (tools: AddToolRequest[]) => Promise<void>;
    existingToolNames?: string[];
}

// Display categories (action-based)
type DisplayCategory = "research" | "extract" | "generate" | "store";

// Category display info
const CATEGORY_INFO: Record<
    DisplayCategory,
    { label: string; description: string; color: string }
> = {
    research: {
        label: "Research",
        description: "Search and browse the web for information",
        color: "bg-purple-900/30 text-purple-400"
    },
    extract: {
        label: "Extract",
        description: "Get content from files, images, and audio",
        color: "bg-cyan-900/30 text-cyan-400"
    },
    generate: {
        label: "Generate",
        description: "Create images, documents, charts, and audio",
        color: "bg-pink-900/30 text-pink-400"
    },
    store: {
        label: "Store",
        description: "Save and download files",
        color: "bg-orange-900/30 text-orange-400"
    }
};

// Category order for display
const CATEGORY_ORDER: DisplayCategory[] = ["research", "extract", "generate", "store"];

// Map tool names to display categories
const TOOL_CATEGORY_MAP: Record<string, DisplayCategory> = {
    // Research - finding information
    web_search: "research",
    web_browse: "research",
    capture_screenshot: "research",
    // Extract - getting content from files/media
    file_read: "extract",
    pdf_extract: "extract",
    ocr_extract: "extract",
    audio_transcribe: "extract",
    // Generate - creating new content
    image_generate: "generate",
    pdf_generate: "generate",
    chart_generate: "generate",
    spreadsheet_generate: "generate",
    text_to_speech: "generate",
    // Store - saving files
    file_write: "store",
    file_download: "store"
};

// Get display category for a tool
function getToolDisplayCategory(tool: BuiltinTool): DisplayCategory {
    return TOOL_CATEGORY_MAP[tool.name] || "extract";
}

export function AddBuiltinToolDialog({
    isOpen,
    onClose,
    onAddTools,
    existingToolNames = []
}: AddBuiltinToolDialogProps) {
    const [tools, setTools] = useState<BuiltinTool[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

    // Fetch builtin tools on open
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            setSearchQuery("");
            setSelectedCategory("all");
            setSelectedTools(new Set());

            getBuiltinTools()
                .then((response) => {
                    if (response.success) {
                        setTools(response.data);
                        // Pre-select tools already added to the agent
                        const preselected = new Set<string>();
                        response.data.forEach((tool) => {
                            if (existingToolNames.includes(tool.name)) {
                                preselected.add(tool.name);
                            }
                        });
                        setSelectedTools(preselected);
                    } else {
                        setError(response.error || "Failed to load builtin tools");
                    }
                })
                .catch((err) => {
                    setError(err instanceof Error ? err.message : "Failed to load builtin tools");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, existingToolNames]);

    // Filter tools by search and display category
    const filteredTools = tools.filter((tool) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            tool.displayName.toLowerCase().includes(query) ||
            tool.description.toLowerCase().includes(query) ||
            tool.name.toLowerCase().includes(query) ||
            (tool.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false);

        const toolDisplayCategory = getToolDisplayCategory(tool);
        const matchesCategory =
            selectedCategory === "all" || toolDisplayCategory === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Group tools by display category
    const availableCategories = Array.from(
        new Set(filteredTools.map((t) => getToolDisplayCategory(t)))
    );
    const sortedCategories = availableCategories.sort(
        (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    );

    const toolsByCategory = sortedCategories.map((category) => ({
        category,
        ...CATEGORY_INFO[category],
        tools: filteredTools.filter((t) => getToolDisplayCategory(t) === category)
    }));

    const handleToggleTool = (toolName: string) => {
        setSelectedTools((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(toolName)) {
                newSet.delete(toolName);
            } else {
                newSet.add(toolName);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedTools.size === filteredTools.length) {
            setSelectedTools(new Set());
        } else {
            setSelectedTools(new Set(filteredTools.map((t) => t.name)));
        }
    };

    const handleAddSelectedTools = async () => {
        if (selectedTools.size === 0) return;

        setIsAdding(true);
        setError(null);

        try {
            const toolsToAdd: AddToolRequest[] = tools
                .filter((tool) => selectedTools.has(tool.name))
                .filter((tool) => !existingToolNames.includes(tool.name)) // Only add tools not already added
                .map((tool) => ({
                    type: "builtin" as const,
                    name: tool.name,
                    description: tool.description,
                    schema: tool.inputSchema,
                    config: {
                        category: tool.category,
                        creditCost: tool.creditCost
                    }
                }));

            if (toolsToAdd.length > 0) {
                await onAddTools(toolsToAdd);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add tools");
        } finally {
            setIsAdding(false);
        }
    };

    // Count of new tools to add (excluding already existing)
    const newToolsCount = Array.from(selectedTools).filter(
        (name) => !existingToolNames.includes(name)
    ).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 !m-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card border border-border rounded-lg shadow-xl w-full mx-4 max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Add Builtin Tools</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Select tools to add to your agent
                        </p>
                    </div>
                    <Button variant="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4">
                        <Alert variant="error">{error}</Alert>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Spinner size="md" />
                            <span className="text-sm text-muted-foreground">Loading tools...</span>
                        </div>
                    ) : (
                        <>
                            {/* Search and Filter Bar */}
                            <div className="p-6 pb-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Search Input */}
                                    <div className="relative sm:flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                        <Input
                                            type="text"
                                            placeholder="Search tools..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    {/* Category Dropdown */}
                                    <Select
                                        value={selectedCategory}
                                        onChange={setSelectedCategory}
                                        options={[
                                            { value: "all", label: "All Categories" },
                                            ...CATEGORY_ORDER.filter((cat) =>
                                                tools.some((t) => getToolDisplayCategory(t) === cat)
                                            ).map((category) => ({
                                                value: category,
                                                label: CATEGORY_INFO[category].label
                                            }))
                                        ]}
                                        className="sm:w-[200px] sm:flex-shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Tools List */}
                            <div className="px-6 pb-6">
                                {/* Select All */}
                                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                                    <span className="text-sm font-medium text-foreground">
                                        {filteredTools.length} tool
                                        {filteredTools.length !== 1 ? "s" : ""} available
                                    </span>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {selectedTools.size === filteredTools.length
                                            ? "Deselect All"
                                            : "Select All"}
                                    </button>
                                </div>

                                {filteredTools.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-sm text-muted-foreground">
                                            No tools found
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {toolsByCategory.map((categoryGroup) => (
                                            <section key={categoryGroup.category}>
                                                <h3 className="text-base font-semibold text-foreground mb-3">
                                                    {categoryGroup.label}
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {categoryGroup.tools.map((tool) => {
                                                        const isSelected = selectedTools.has(
                                                            tool.name
                                                        );
                                                        const isExisting =
                                                            existingToolNames.includes(tool.name);

                                                        return (
                                                            <button
                                                                key={tool.name}
                                                                onClick={() =>
                                                                    handleToggleTool(tool.name)
                                                                }
                                                                className={`p-4 border rounded-lg transition-colors text-left flex items-start gap-3 ${
                                                                    isSelected
                                                                        ? "border-primary bg-primary/10"
                                                                        : "border-border hover:bg-accent"
                                                                }`}
                                                            >
                                                                <div
                                                                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                                        isSelected
                                                                            ? "bg-primary border-primary text-primary-foreground"
                                                                            : "border-muted-foreground/50"
                                                                    }`}
                                                                >
                                                                    {isSelected && (
                                                                        <Check className="w-3 h-3" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                        <span className="font-medium text-foreground">
                                                                            {tool.displayName}
                                                                        </span>
                                                                        {isExisting && (
                                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                                Added
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            className={`text-xs px-1.5 py-0.5 rounded ${
                                                                                CATEGORY_INFO[
                                                                                    getToolDisplayCategory(
                                                                                        tool
                                                                                    )
                                                                                ]?.color
                                                                            }`}
                                                                            title={
                                                                                CATEGORY_INFO[
                                                                                    getToolDisplayCategory(
                                                                                        tool
                                                                                    )
                                                                                ]?.description
                                                                            }
                                                                        >
                                                                            {
                                                                                CATEGORY_INFO[
                                                                                    getToolDisplayCategory(
                                                                                        tool
                                                                                    )
                                                                                ]?.label
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                                        {tool.description}
                                                                    </p>
                                                                    {tool.creditCost > 0 && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            {tool.creditCost} credit
                                                                            {tool.creditCost !== 1
                                                                                ? "s"
                                                                                : ""}{" "}
                                                                            per use
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                    <span className="text-sm text-muted-foreground">
                        {selectedTools.size} selected
                        {newToolsCount < selectedTools.size && ` (${newToolsCount} new)`}
                    </span>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAddSelectedTools}
                            disabled={newToolsCount === 0 || isAdding}
                            loading={isAdding}
                        >
                            Add Selected ({newToolsCount})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
