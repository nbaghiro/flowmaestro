import {
    Bot,
    Eye,
    Mic,
    Sparkles,
    GitFork,
    GitBranch,
    GitMerge,
    Repeat,
    Code2,
    Clock,
    Hand,
    Shuffle,
    Send,
    BookOpen,
    Globe,
    Database,
    Zap,
    Play,
    ChevronDown,
    ChevronRight,
    Search,
    Pin,
    PinOff,
    UserCheck,
    Image,
    Video,
    // Category icons
    Download,
    Upload,
    Cpu,
    Wrench,
    MessageSquare,
    // Visual variant icons
    FileUp,
    FileText,
    Link,
    Volume2,
    // Integration fallback icon
    Plug,
    // New builtin tool node icons
    BarChart2,
    FileSpreadsheet,
    AudioLines,
    ScanText,
    FileOutput,
    Camera,
    ExternalLink,
    FileSearch,
    FileDown,
    FileInput,
    FilePenLine,
    type LucideIcon
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { ALL_PROVIDERS, getProvidersByCategory } from "@flowmaestro/shared";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Tooltip } from "../../components/common/Tooltip";
import { WorkflowEvents } from "../../lib/analytics";
import { useThemeStore } from "../../stores/themeStore";

interface NodeDefinition {
    type: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    logoUrl?: string;
    category: string;
    description: string;
}

const nodeLibrary: NodeDefinition[] = [
    // Inputs - workflow entry points and data collection
    {
        type: "input",
        label: "Input",
        icon: Hand,
        category: "inputs",
        description: "Provide text or JSON data to the workflow"
    },
    {
        type: "trigger",
        label: "Trigger",
        icon: Zap,
        category: "inputs",
        description: "Schedule, webhook, or manual workflow trigger"
    },
    {
        type: "files",
        label: "Files",
        icon: FileUp,
        category: "inputs",
        description: "Upload and process files (PDF, images, docs)"
    },
    {
        type: "url",
        label: "URL",
        icon: Link,
        category: "inputs",
        description: "Fetch and scrape content from web URLs"
    },
    {
        type: "audioInput",
        label: "Audio Input",
        icon: Mic,
        category: "inputs",
        description: "Record or upload audio for processing"
    },
    // Outputs - workflow results and actions
    {
        type: "output",
        label: "Output",
        icon: Send,
        category: "outputs",
        description: "Display final workflow results"
    },
    {
        type: "action",
        label: "Action",
        icon: Play,
        category: "outputs",
        description: "Perform tasks in external apps (send email, post message)"
    },
    {
        type: "audioOutput",
        label: "Audio Output",
        icon: Volume2,
        category: "outputs",
        description: "Generate speech output (text-to-speech)"
    },
    {
        type: "templateOutput",
        label: "Template Output",
        icon: FileText,
        category: "outputs",
        description: "Render markdown templates with variable interpolation"
    },

    // AI & ML - AI-powered processing
    {
        type: "llm",
        label: "LLM",
        icon: Bot,
        category: "ai",
        description: "Text generation with OpenAI, Anthropic, Google, etc."
    },
    {
        type: "vision",
        label: "Vision",
        icon: Eye,
        category: "ai",
        description: "Image generation and analysis with AI models"
    },
    {
        type: "imageGeneration",
        label: "Image",
        icon: Image,
        category: "ai",
        description: "Generate and edit images with AI (DALL-E, Flux, Stable Diffusion)"
    },
    {
        type: "videoGeneration",
        label: "Video",
        icon: Video,
        category: "ai",
        description: "Generate videos with AI (Kling, MiniMax, Mochi, Runway)"
    },
    {
        type: "humanReview",
        label: "Human Review",
        icon: UserCheck,
        category: "ai",
        description: "Pause workflow for human review and approval"
    },
    {
        type: "shared-memory",
        label: "Shared Memory",
        icon: Database,
        category: "ai",
        description: "Key-value storage accessible by all nodes with semantic search"
    },
    {
        type: "embeddings",
        label: "Embeddings",
        icon: Sparkles,
        category: "ai",
        description: "Generate vector embeddings for semantic search"
    },
    {
        type: "knowledgeBaseQuery",
        label: "KB Query",
        icon: BookOpen,
        category: "ai",
        description: "Search knowledge base using semantic similarity (RAG)"
    },
    {
        type: "router",
        label: "Router",
        icon: GitFork,
        category: "ai",
        description: "AI-powered routing based on content classification"
    },
    {
        type: "audioTranscription",
        label: "Transcribe",
        icon: AudioLines,
        category: "ai",
        description: "Transcribe audio to text using Whisper"
    },
    {
        type: "ocrExtraction",
        label: "OCR",
        icon: ScanText,
        category: "ai",
        description: "Extract text from images using Tesseract OCR"
    },

    // Integrations - third-party service connections (individual nodes added in Phase 4)
    // Note: Individual integration nodes (slack, gmail, etc.) will be added dynamically

    // Logic & Code - control flow and data processing
    {
        type: "conditional",
        label: "Conditional",
        icon: GitBranch,
        category: "logic",
        description: "Branch workflow based on if/else conditions"
    },
    {
        type: "switch",
        label: "Switch",
        icon: GitMerge,
        category: "logic",
        description: "Multiple branch conditions like switch/case"
    },
    {
        type: "loop",
        label: "Loop",
        icon: Repeat,
        category: "logic",
        description: "Iterate over arrays or lists of items"
    },
    {
        type: "code",
        label: "Code",
        icon: Code2,
        category: "logic",
        description: "Run custom JavaScript or Python code"
    },
    {
        type: "wait",
        label: "Wait/Delay",
        icon: Clock,
        category: "logic",
        description: "Pause workflow execution for a duration"
    },
    {
        type: "transform",
        label: "Transform",
        icon: Shuffle,
        category: "logic",
        description: "Transform data with JSONPath, templates, filters"
    },

    // Utils - generic tools
    {
        type: "http",
        label: "HTTP",
        icon: Globe,
        category: "utils",
        description: "Make HTTP requests to external APIs"
    },
    {
        type: "database",
        label: "Database",
        icon: Database,
        category: "utils",
        description: "Query SQL or NoSQL databases"
    },
    {
        type: "chartGeneration",
        label: "Chart",
        icon: BarChart2,
        category: "utils",
        description: "Generate charts and visualizations from data"
    },
    {
        type: "spreadsheetGeneration",
        label: "Spreadsheet",
        icon: FileSpreadsheet,
        category: "utils",
        description: "Generate Excel or CSV files from data"
    },
    {
        type: "webSearch",
        label: "Web Search",
        icon: Search,
        category: "utils",
        description: "Search the web using Tavily API"
    },
    {
        type: "webBrowse",
        label: "Web Browse",
        icon: ExternalLink,
        category: "utils",
        description: "Fetch and extract content from web pages"
    },
    {
        type: "pdfExtract",
        label: "PDF Extract",
        icon: FileSearch,
        category: "utils",
        description: "Extract text and metadata from PDF documents"
    },
    {
        type: "pdfGeneration",
        label: "PDF Generate",
        icon: FileOutput,
        category: "utils",
        description: "Generate PDF documents from markdown or HTML"
    },
    {
        type: "screenshotCapture",
        label: "Screenshot",
        icon: Camera,
        category: "utils",
        description: "Capture screenshots of web pages"
    },
    {
        type: "fileDownload",
        label: "File Download",
        icon: FileDown,
        category: "utils",
        description: "Download files from URLs"
    },
    {
        type: "fileRead",
        label: "File Read",
        icon: FileInput,
        category: "utils",
        description: "Read files from the execution workspace"
    },
    {
        type: "fileWrite",
        label: "File Write",
        icon: FilePenLine,
        category: "utils",
        description: "Write files to the execution workspace"
    },
    {
        type: "comment",
        label: "Comment",
        icon: MessageSquare,
        category: "utils",
        description: "Add notes and documentation to your workflow"
    }
];

interface CategoryDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
}

const categories: CategoryDefinition[] = [
    // Colors defined via CSS variables in App.css - update colors there only
    {
        id: "inputs",
        label: "Inputs",
        icon: Download,
        color: "category-inputs-icon-text",
        bgColor: "category-inputs-icon-bg"
    },
    {
        id: "outputs",
        label: "Outputs",
        icon: Upload,
        color: "category-outputs-icon-text",
        bgColor: "category-outputs-icon-bg"
    },
    {
        id: "ai",
        label: "AI & ML",
        icon: Cpu,
        color: "category-ai-icon-text",
        bgColor: "category-ai-icon-bg"
    },
    {
        id: "integrations",
        label: "Integrations",
        icon: Zap,
        color: "category-integrations-icon-text",
        bgColor: "category-integrations-icon-bg"
    },
    {
        id: "logic",
        label: "Logic & Code",
        icon: Code2,
        color: "category-logic-icon-text",
        bgColor: "category-logic-icon-bg"
    },
    {
        id: "utils",
        label: "Utils",
        icon: Wrench,
        color: "category-utils-icon-text",
        bgColor: "category-utils-icon-bg"
    }
];

// Generate integration node entries from implemented providers
// Filter out AI & ML providers (they use specialized nodes like LLM, Image Generation)
// Derived from centralized ALL_PROVIDERS in shared package
const AI_PROVIDER_IDS = getProvidersByCategory("AI & ML");

const integrationNodes: NodeDefinition[] = ALL_PROVIDERS.filter(
    (provider) => !provider.comingSoon && !AI_PROVIDER_IDS.includes(provider.provider)
).map((provider) => ({
    type: provider.provider,
    label: provider.displayName,
    logoUrl: provider.logoUrl,
    category: "integrations",
    description: provider.description
}));

// Combine static nodes with dynamic integration nodes
const allNodes: NodeDefinition[] = [...nodeLibrary, ...integrationNodes];

interface NodeLibraryProps {
    isCollapsed?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
    isPinned?: boolean;
    onPinToggle?: () => void;
}

export function NodeLibrary({
    isCollapsed = false,
    onExpand,
    onCollapse,
    isPinned = false,
    onPinToggle
}: NodeLibraryProps) {
    // Start with all categories collapsed (state resets on page refresh)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const effectiveTheme = useThemeStore((state) => state.effectiveTheme);

    // Track node palette search with debounce
    useEffect(() => {
        if (!searchQuery) return;
        const timer = setTimeout(() => {
            WorkflowEvents.nodePaletteSearched({ query: searchQuery });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";
        // Don't collapse here - let onMouseLeave handle it naturally during drag
    }, []);

    // Auto expand/collapse on hover (unless pinned)
    const handleMouseEnter = useCallback(() => {
        if (!isPinned && isCollapsed) {
            onExpand?.();
        }
    }, [isPinned, isCollapsed, onExpand]);

    const handleMouseLeave = useCallback(() => {
        if (!isPinned && !isCollapsed) {
            onCollapse?.();
        }
    }, [isPinned, isCollapsed, onCollapse]);

    const filteredLibrary = allNodes.filter((node) =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Wrapper div to maintain layout space when sidebar is collapsed
    return (
        <div className="relative flex-shrink-0" onMouseEnter={handleMouseEnter}>
            {/* Collapsed sidebar - always takes up space in layout */}
            <div
                className={`w-12 bg-card border-r border-border flex flex-col items-center py-3 gap-1 h-full transition-opacity duration-200 ${
                    isCollapsed ? "opacity-100" : "opacity-0"
                }`}
            >
                {/* Search icon */}
                <button
                    className="p-2 rounded-md hover:bg-muted/50 transition-colors"
                    title="Search nodes"
                >
                    <Search className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Divider */}
                <div className="w-6 h-px bg-border my-1" />

                {/* Category icons */}
                {categories.map((category) => {
                    const CategoryIcon = category.icon;
                    return (
                        <button
                            key={category.id}
                            className="p-2 rounded-md hover:bg-muted/50 transition-colors"
                            title={category.label}
                        >
                            <CategoryIcon className={`w-4 h-4 ${category.color}`} />
                        </button>
                    );
                })}
            </div>

            {/* Expanded sidebar - hovers over canvas with smooth animation */}
            <div
                className={`absolute top-0 left-0 w-64 bg-card border-r border-border flex flex-col h-full shadow-lg z-50 transition-all duration-200 ease-out ${
                    isCollapsed
                        ? "opacity-0 -translate-x-2 pointer-events-none"
                        : "opacity-100 translate-x-0"
                }`}
                onMouseLeave={handleMouseLeave}
            >
                {/* Header */}
                <div className="px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                            <Input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs"
                            />
                        </div>
                        <Button
                            variant="icon"
                            onClick={onPinToggle}
                            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                            className="p-1.5 flex-shrink-0"
                        >
                            {isPinned ? (
                                <Pin className="w-3.5 h-3.5 text-primary" />
                            ) : (
                                <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex-1 overflow-y-auto py-2">
                    {categories.map((category) => {
                        const nodes = filteredLibrary.filter(
                            (node) => node.category === category.id
                        );
                        if (nodes.length === 0 && searchQuery) return null;

                        const isExpanded = expandedCategories.has(category.id);

                        const CategoryIcon = category.icon;
                        return (
                            <div key={category.id} className="mb-1">
                                <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/50 transition-colors group"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    )}
                                    <CategoryIcon className={`w-3.5 h-3.5 ${category.color}`} />
                                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {category.label}
                                    </h3>
                                </button>

                                {isExpanded && (
                                    <div className="py-0.5">
                                        {nodes.map((node) => {
                                            const IconComponent = node.icon;
                                            const hasLogo = !!node.logoUrl;

                                            return (
                                                <Tooltip
                                                    key={node.type}
                                                    content={node.description}
                                                    position="right"
                                                    delay={400}
                                                >
                                                    <div
                                                        draggable
                                                        onDragStart={(e) =>
                                                            onDragStart(e, node.type)
                                                        }
                                                        className="group pl-7 pr-3 py-1.5 cursor-move hover:bg-muted/70 transition-colors active:bg-muted flex items-center gap-2"
                                                    >
                                                        <div
                                                            className={`p-1 rounded ${hasLogo ? (effectiveTheme === "dark" ? "bg-zinc-700" : "bg-white") : category.bgColor} flex-shrink-0 flex items-center justify-center`}
                                                        >
                                                            {hasLogo ? (
                                                                <img
                                                                    src={node.logoUrl}
                                                                    alt={node.label}
                                                                    className="w-4 h-4 object-contain"
                                                                    onError={(e) => {
                                                                        // Fallback to Plug icon on error
                                                                        e.currentTarget.style.display =
                                                                            "none";
                                                                        e.currentTarget.nextElementSibling?.classList.remove(
                                                                            "hidden"
                                                                        );
                                                                    }}
                                                                />
                                                            ) : IconComponent ? (
                                                                <IconComponent
                                                                    className={`w-3.5 h-3.5 ${category.color}`}
                                                                />
                                                            ) : (
                                                                <Plug
                                                                    className={`w-3.5 h-3.5 ${category.color}`}
                                                                />
                                                            )}
                                                            {hasLogo && (
                                                                <Plug
                                                                    className={`w-4 h-4 ${category.color} hidden`}
                                                                />
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-medium text-foreground">
                                                            {node.label}
                                                        </span>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
