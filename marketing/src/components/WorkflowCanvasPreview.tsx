import {
    ArrowRightLeft,
    BarChart3,
    Bot,
    Brain,
    Camera,
    Clock,
    Code,
    Database,
    Download,
    Eye,
    FileInput,
    FileOutput,
    FileSearch,
    FileText,
    GitBranch,
    Globe,
    Image,
    LucideIcon,
    MessageSquare,
    Mic,
    Plug,
    Repeat,
    Search,
    Shuffle,
    Speaker,
    Table,
    Upload,
    UserCheck,
    Video,
    Zap
} from "lucide-react";
import { useMemo } from "react";
import Flow, { ConnectionMode, Edge, Node, Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils";
import { ZoomCompensatedBackground } from "./ZoomCompensatedBackground";

interface WorkflowNode {
    type: string;
    name?: string;
    position?: { x: number; y: number };
    config?: Record<string, unknown>;
}

export interface WorkflowDefinition {
    nodes?:
        | Record<string, WorkflowNode>
        | Array<{
              id: string;
              type: string;
              position?: { x: number; y: number };
              data?: Record<string, unknown>;
          }>;
    edges?: Array<{
        id?: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
    }>;
}

interface WorkflowCanvasPreviewProps {
    definition?: WorkflowDefinition;
    height?: string;
    className?: string;
}

// Node type to category mapping
type NodeCategory = "ai" | "logic" | "inputs" | "outputs" | "utils" | "integrations" | "data";

// Category colors - matching frontend exactly
const categoryColors: Record<NodeCategory, { light: string; dark: string }> = {
    inputs: { light: "#059669", dark: "#10b981" }, // emerald
    outputs: { light: "#ef4444", dark: "#f87171" }, // red
    ai: { light: "#3b82f6", dark: "#60a5fa" }, // blue
    integrations: { light: "#f97316", dark: "#fb923c" }, // orange
    logic: { light: "#a855f7", dark: "#c084fc" }, // purple
    utils: { light: "#78716c", dark: "#a8a29e" }, // stone
    data: { light: "#14b8a6", dark: "#2dd4bf" } // teal
};

const nodeTypeConfig: Record<string, { icon: LucideIcon; category: NodeCategory; label: string }> =
    {
        trigger: { icon: Zap, category: "inputs", label: "Trigger" },
        input: { icon: FileInput, category: "inputs", label: "Input" },
        files: { icon: Upload, category: "inputs", label: "Files" },
        url: { icon: Globe, category: "inputs", label: "URL" },
        audioInput: { icon: Mic, category: "inputs", label: "Audio Input" },

        llm: { icon: Bot, category: "ai", label: "LLM" },
        vision: { icon: Eye, category: "ai", label: "Vision" },
        embeddings: { icon: Brain, category: "ai", label: "Embeddings" },
        knowledgeBaseQuery: { icon: Brain, category: "ai", label: "Knowledge Base" },
        imageGeneration: { icon: Image, category: "ai", label: "Image Generation" },
        videoGeneration: { icon: Video, category: "ai", label: "Video Generation" },

        router: { icon: GitBranch, category: "logic", label: "Router" },
        conditional: { icon: GitBranch, category: "logic", label: "Conditional" },
        switch: { icon: ArrowRightLeft, category: "logic", label: "Switch" },
        loop: { icon: Repeat, category: "logic", label: "Loop" },

        code: { icon: Code, category: "utils", label: "Code" },
        wait: { icon: Clock, category: "utils", label: "Wait" },
        humanReview: { icon: UserCheck, category: "utils", label: "Human Review" },
        transform: { icon: Shuffle, category: "utils", label: "Transform" },
        http: { icon: Globe, category: "utils", label: "HTTP" },
        chartGeneration: { icon: BarChart3, category: "utils", label: "Chart" },
        spreadsheetGeneration: { icon: Table, category: "utils", label: "Spreadsheet" },
        audioTranscription: { icon: Mic, category: "utils", label: "Transcription" },
        ocrExtraction: { icon: FileSearch, category: "utils", label: "OCR" },
        pdfGeneration: { icon: FileText, category: "utils", label: "PDF Generation" },
        pdfExtract: { icon: FileSearch, category: "utils", label: "PDF Extract" },
        screenshotCapture: { icon: Camera, category: "utils", label: "Screenshot" },
        webSearch: { icon: Search, category: "utils", label: "Web Search" },
        webBrowse: { icon: Globe, category: "utils", label: "Web Browse" },
        fileDownload: { icon: Download, category: "utils", label: "File Download" },
        fileRead: { icon: FileSearch, category: "utils", label: "File Read" },
        fileWrite: { icon: FileText, category: "utils", label: "File Write" },

        "shared-memory": { icon: Database, category: "data", label: "Shared Memory" },
        database: { icon: Database, category: "data", label: "Database" },

        output: { icon: FileOutput, category: "outputs", label: "Output" },
        templateOutput: { icon: FileText, category: "outputs", label: "Template Output" },
        audioOutput: { icon: Speaker, category: "outputs", label: "Audio Output" },
        action: { icon: Zap, category: "outputs", label: "Action" },

        integration: { icon: Plug, category: "integrations", label: "Integration" },
        comment: { icon: MessageSquare, category: "utils", label: "Comment" }
    };

interface PreviewNodeData {
    label: string;
    type: string;
    isDark?: boolean;
    // LLM/Vision
    provider?: string;
    model?: string;
    prompt?: string;
    operation?: string;
    // HTTP
    method?: string;
    url?: string;
    // Input
    inputType?: string;
    inputVariable?: string;
    variableName?: string;
    // Output
    format?: string;
    value?: string;
    // Trigger
    triggerType?: string;
    description?: string;
    // Integration
    integrationProvider?: string;
    action?: string;
    operationType?: string;
    // Router
    routes?: unknown[];
    // Allow any additional properties
    [key: string]: unknown;
}

// Styled preview node component matching frontend's BaseNode appearance
function PreviewNode({ data }: { data: PreviewNodeData }) {
    const config = nodeTypeConfig[data.type] || {
        icon: Plug,
        category: "utils" as NodeCategory,
        label: data.type
    };
    const Icon = config.icon;
    const colors = categoryColors[config.category];
    const categoryColor = data.isDark ? colors.dark : colors.light;

    // Generate preview content based on node type
    const renderContent = () => {
        // LLM nodes - show provider, model, and prompt
        if (data.type === "llm") {
            const provider = (data.provider as string) || "openai";
            const model = (data.model as string) || "gpt-4";
            const prompt = data.prompt as string | undefined;
            const promptPreview = prompt
                ? prompt.substring(0, 50) + (prompt.length > 50 ? "..." : "")
                : "No prompt configured";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Provider:</span>
                        <span className="text-xs font-medium text-foreground">{provider}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Model:</span>
                        <span className="text-xs font-medium text-foreground">{model}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-border">
                        <div className="text-xs text-muted-foreground italic line-clamp-2">
                            {promptPreview}
                        </div>
                    </div>
                </div>
            );
        }

        // Vision nodes - show operation and model
        if (data.type === "vision") {
            const model = (data.model as string) || "gpt-4-vision";
            const operation = (data.operation as string) || "Analyze";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Operation:</span>
                        <span className="text-xs font-medium text-foreground capitalize">
                            {operation}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Model:</span>
                        <span className="text-xs font-medium text-foreground">{model}</span>
                    </div>
                </div>
            );
        }

        // Input nodes - show type and variable
        if (data.type === "input") {
            const inputType = (data.inputType as string) || "text";
            const variableName =
                (data.inputVariable as string) || (data.variableName as string) || "userInput";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium text-foreground capitalize">
                            {inputType}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Variable:</span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                            ${variableName}
                        </span>
                    </div>
                </div>
            );
        }

        // Output nodes - show format and value preview
        if (data.type === "output" || data.type === "templateOutput") {
            const format = (data.format as string) || "text";
            const rawValue = data.value as string | undefined;
            const value = rawValue || "No output template";
            const valuePreview = value.substring(0, 60) + (value.length > 60 ? "..." : "");

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Format:</span>
                        <span className="text-xs font-medium text-foreground uppercase">
                            {format}
                        </span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-border">
                        <div className="text-xs text-muted-foreground italic line-clamp-2">
                            {valuePreview}
                        </div>
                    </div>
                </div>
            );
        }

        // HTTP nodes
        if (data.type === "http") {
            const method = (data.method as string) || "GET";
            const url = (data.url as string) || "https://api.example.com";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Method:</span>
                        <span className="text-xs font-medium font-mono text-foreground">
                            {method}
                        </span>
                    </div>
                    <div className="text-xs font-mono bg-muted/50 px-1.5 py-1 rounded truncate text-foreground">
                        {url}
                    </div>
                </div>
            );
        }

        // Trigger nodes - show trigger type
        if (data.type === "trigger") {
            const triggerType = (data.triggerType as string) || "manual";
            const description = (data.description as string) || "";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium text-foreground capitalize">
                            {triggerType}
                        </span>
                    </div>
                    {description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                            {description}
                        </div>
                    )}
                </div>
            );
        }

        // Integration nodes - show provider
        if (data.type === "integration") {
            const provider =
                (data.provider as string) || (data.integrationProvider as string) || "Service";
            const action = (data.action as string) || (data.operationType as string) || "";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Provider:</span>
                        <span className="text-xs font-medium text-foreground capitalize">
                            {provider}
                        </span>
                    </div>
                    {action && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Action:</span>
                            <span className="text-xs font-medium text-foreground">{action}</span>
                        </div>
                    )}
                </div>
            );
        }

        // Router nodes - show route count
        if (data.type === "router") {
            const routes = (data.routes as unknown[]) || [];
            const provider = (data.provider as string) || "openai";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Provider:</span>
                        <span className="text-xs font-medium text-foreground">{provider}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Routes:</span>
                        <span className="text-xs font-medium text-foreground">{routes.length}</span>
                    </div>
                </div>
            );
        }

        // Transform nodes
        if (data.type === "transform") {
            const operation = (data.operation as string) || "transform";

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Operation:</span>
                        <span className="text-xs font-medium text-foreground capitalize">
                            {operation}
                        </span>
                    </div>
                </div>
            );
        }

        // Default content for other node types - show config label
        return (
            <div className="text-xs text-muted-foreground">
                Configure {config.label.toLowerCase()}...
            </div>
        );
    };

    return (
        <div
            className="flex flex-col bg-card rounded-md overflow-hidden border border-border"
            style={{
                width: "100%",
                height: "100%",
                borderLeftWidth: "4px",
                borderLeftColor: categoryColor,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                    <div
                        className="p-1 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${categoryColor}20` }}
                    >
                        <Icon className="w-3.5 h-3.5" style={{ color: categoryColor }} />
                    </div>
                    <span className="font-medium text-xs text-foreground truncate max-w-[150px]">
                        {data.label || config.label}
                    </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500 flex-shrink-0" />
            </div>

            {/* Content */}
            <div className="flex-1 px-3 py-2 bg-card overflow-hidden">{renderContent()}</div>

            {/* Handles with explicit default IDs */}
            {data.type !== "trigger" && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="target"
                    className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                />
            )}
            <Handle
                type="source"
                position={Position.Right}
                id="source"
                className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
            />
        </div>
    );
}

// Create nodeTypes object with all supported types
const previewNodeTypes: Record<string, typeof PreviewNode> = {};
Object.keys(nodeTypeConfig).forEach((type) => {
    previewNodeTypes[type] = PreviewNode;
});
// Add default for unknown types
previewNodeTypes["default"] = PreviewNode;

/**
 * Simplified workflow canvas preview for marketing template cards.
 */
export function WorkflowCanvasPreview({
    definition,
    height = "h-40",
    className
}: WorkflowCanvasPreviewProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const { nodes, edges } = useMemo(() => {
        if (!definition?.nodes) {
            return { nodes: [], edges: [] };
        }

        // Convert nodes - handle both Record and Array formats
        interface NodeEntry {
            id: string;
            type: string;
            name?: string;
            position?: { x: number; y: number };
            data?: Record<string, unknown>;
            config?: Record<string, unknown>;
        }
        let nodeEntries: NodeEntry[] = [];

        if (Array.isArray(definition.nodes)) {
            nodeEntries = definition.nodes as NodeEntry[];
        } else if (definition.nodes && typeof definition.nodes === "object") {
            nodeEntries = Object.entries(definition.nodes).map(([id, node]) => ({
                id,
                ...node
            }));
        }

        const flowNodes: Node[] = nodeEntries.map((node, index) => ({
            id: node.id,
            type: node.type in previewNodeTypes ? node.type : "default",
            position: node.position || {
                x: 100 + (index % 4) * 250,
                y: 100 + Math.floor(index / 4) * 150
            },
            data: {
                label:
                    (node.data?.label as string) ||
                    node.name ||
                    nodeTypeConfig[node.type]?.label ||
                    node.type,
                type: node.type,
                isDark,
                ...node.data,
                ...node.config
            },
            // Fixed dimensions for consistent sizing in previews - match frontend
            style: { width: 260, height: 160 }
        }));

        // Map all edges to use our simplified handle IDs ("source" and "target")
        // This ensures edges connect regardless of the original sourceHandle/targetHandle values
        const flowEdges: Edge[] = (definition.edges || []).map((edge) => ({
            id: edge.id || `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: "source",
            targetHandle: "target"
        }));

        return { nodes: flowNodes, edges: flowEdges };
    }, [definition, isDark]);

    if (nodes.length === 0) {
        return (
            <div className={cn(height, "bg-muted/50 flex items-center justify-center", className)}>
                <span className="text-xs text-muted-foreground">No preview available</span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                height,
                "workflow-preview relative overflow-hidden",
                isDark ? "bg-[hsl(0,0%,12%)]" : "bg-[hsl(0,0%,94%)]",
                className
            )}
        >
            <Flow
                nodes={nodes}
                edges={edges}
                nodeTypes={previewNodeTypes}
                connectionMode={ConnectionMode.Loose}
                defaultEdgeOptions={{
                    type: "default",
                    style: { stroke: isDark ? "#6b7280" : "#9ca3af", strokeWidth: 1.5 }
                }}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.1}
                maxZoom={1}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                preventScrolling={true}
                proOptions={{ hideAttribution: true }}
                className="pointer-events-none"
            >
                <ZoomCompensatedBackground baseGap={16} baseSize={1} />
            </Flow>
        </div>
    );
}
