import { X } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ALL_PROVIDERS, type ValidationError } from "@flowmaestro/shared";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { cn } from "../../lib/utils";
import { useWorkflowStore } from "../../stores/workflowStore";

// Panel resize constants
const MIN_WIDTH = 320;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 384; // 24rem = 384px (w-96)

// AI provider IDs (these use the LLM node, not Integration node)
const AI_PROVIDER_IDS = ["openai", "anthropic", "google", "huggingface", "cohere"];

// Check if a node type is an integration provider
const isProviderNodeType = (type: string): boolean => {
    return ALL_PROVIDERS.some(
        (p) => p.provider === type && !p.comingSoon && !AI_PROVIDER_IDS.includes(p.provider)
    );
};
// AI & ML
import { ActionNodeConfig } from "./configs/ActionNodeConfig";
import { AudioInputNodeConfig } from "./configs/AudioInputNodeConfig";
import { AudioOutputNodeConfig } from "./configs/AudioOutputNodeConfig";
// Logic & Code
import { CodeNodeConfig } from "./configs/CodeNodeConfig";
import { ConditionalNodeConfig } from "./configs/ConditionalNodeConfig";
// Data Operations
// Connect
import { DatabaseNodeConfig } from "./configs/DatabaseNodeConfig";
import { EmbeddingsNodeConfig } from "./configs/EmbeddingsNodeConfig";
import { FilesNodeConfig } from "./configs/FilesNodeConfig";
import { HTTPNodeConfig } from "./configs/HTTPNodeConfig";
import { HumanReviewNodeConfig } from "./configs/HumanReviewNodeConfig";
import { InputNodeConfig } from "./configs/InputNodeConfig";
import { IntegrationNodeConfig } from "./configs/IntegrationNodeConfig";
import { KnowledgeBaseQueryNodeConfig } from "./configs/KnowledgeBaseQueryNodeConfig";
import { LLMNodeConfig } from "./configs/LLMNodeConfig";
import { LoopNodeConfig } from "./configs/LoopNodeConfig";
import { OutputNodeConfig } from "./configs/OutputNodeConfig";
import { RouterNodeConfig } from "./configs/RouterNodeConfig";
import { SharedMemoryNodeConfig } from "./configs/SharedMemoryNodeConfig";
import { SwitchNodeConfig } from "./configs/SwitchNodeConfig";
import { TemplateOutputNodeConfig } from "./configs/TemplateOutputNodeConfig";
import { TransformNodeConfig } from "./configs/TransformNodeConfig";
import { TriggerNodeConfig } from "./configs/TriggerNodeConfig";
import { URLNodeConfig } from "./configs/URLNodeConfig";
import { VisionNodeConfig } from "./configs/VisionNodeConfig";
import { WaitNodeConfig } from "./configs/WaitNodeConfig";

export function NodeInspector() {
    const { nodes, selectedNode, selectNode, updateNode, nodeValidation } = useWorkflowStore();

    const node = nodes.find((n) => n.id === selectedNode);
    const [nodeName, setNodeName] = useState(node?.data.label || "");

    // Panel resize state
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = localStorage.getItem("flowmaestro:nodeInspector:width");
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

    // Get validation errors for the selected node
    const validationErrors: ValidationError[] =
        selectedNode && nodeValidation[selectedNode] ? nodeValidation[selectedNode].errors : [];

    // Sync node name when node changes
    useEffect(() => {
        if (node) {
            setNodeName(node.data.label || "");
        }
    }, [node?.id, node?.data.label]);

    const handleClose = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const handleUpdate = useCallback(
        (config: unknown) => {
            if (!node) return;
            updateNode(node.id, config as unknown as import("@flowmaestro/shared").JsonObject);
        },
        [node, updateNode]
    );

    const handleNameChange = useCallback(
        (newName: string) => {
            if (!node) return;
            setNodeName(newName);
            updateNode(node.id, { label: newName });
        },
        [node, updateNode]
    );

    // Handle resize start
    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.clientX;
            resizeStartWidth.current = panelWidth;
        },
        [panelWidth]
    );

    // Handle resize
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStartX.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, resizeStartWidth.current + deltaX)
            );

            setPanelWidth(newWidth);
        };

        const handleResizeEnd = () => {
            if (isResizing) {
                setIsResizing(false);
                // Save to localStorage
                localStorage.setItem("flowmaestro:nodeInspector:width", panelWidth.toString());
            }
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResize);
            document.addEventListener("mouseup", handleResizeEnd);

            return () => {
                document.removeEventListener("mousemove", handleResize);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }

        return undefined;
    }, [isResizing, panelWidth]);

    // Early return AFTER all hooks have been called
    if (!node) {
        return null;
    }

    const renderConfig = () => {
        switch (node.type) {
            // AI & ML
            case "llm":
                return (
                    <LLMNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "vision":
                return (
                    <VisionNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "audioInput":
                return (
                    <AudioInputNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "embeddings":
                return (
                    <EmbeddingsNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "router":
                return (
                    <RouterNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            // Logic & Code
            case "conditional":
                return (
                    <ConditionalNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "switch":
                return (
                    <SwitchNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "loop":
                return (
                    <LoopNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "code":
                return (
                    <CodeNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "wait":
                return (
                    <WaitNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "humanReview":
                return (
                    <HumanReviewNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            // Inputs
            case "trigger":
                return (
                    <TriggerNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "files":
                return (
                    <FilesNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "url":
                return <URLNodeConfig nodeId={node.id} data={node.data} onUpdate={handleUpdate} />;
            case "input":
                return (
                    <InputNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            // Outputs
            case "output":
                return (
                    <OutputNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "audioOutput":
                return (
                    <AudioOutputNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            case "templateOutput":
                return (
                    <TemplateOutputNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            case "action":
                return (
                    <ActionNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            // Logic & Code
            case "transform":
                return (
                    <TransformNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "shared-memory":
                return (
                    <SharedMemoryNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            // Utils
            case "http":
                return (
                    <HTTPNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "database":
                return (
                    <DatabaseNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "integration":
                return (
                    <IntegrationNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );
            case "knowledgeBaseQuery":
                return (
                    <KnowledgeBaseQueryNodeConfig
                        nodeId={node.id}
                        data={node.data}
                        onUpdate={handleUpdate}
                        errors={validationErrors}
                    />
                );

            default:
                // Check if it's a provider node (e.g., slack, gmail, etc.)
                if (node.type && isProviderNodeType(node.type)) {
                    return (
                        <IntegrationNodeConfig
                            nodeId={node.id}
                            data={node.data}
                            onUpdate={handleUpdate}
                            errors={validationErrors}
                        />
                    );
                }
                return (
                    <div className="p-4 text-sm text-muted-foreground">
                        Configuration for {node.type} node coming soon...
                    </div>
                );
        }
    };

    return (
        <div
            className="bg-card border-l border-border flex flex-col h-full shadow-panel relative"
            style={{ width: panelWidth }}
        >
            {/* Resize Handle */}
            <div
                className={cn(
                    "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors z-10",
                    isResizing && "bg-primary/30"
                )}
                onMouseDown={handleResizeStart}
            >
                {/* Wider invisible hit area */}
                <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Node Configuration</h2>
                </div>
                <Button variant="icon" onClick={handleClose} title="Close" className="p-1">
                    <X className="w-4 h-4 text-muted-foreground" />
                </Button>
            </div>

            {/* Node Name Field */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Node Name
                </label>
                <Input
                    type="text"
                    value={nodeName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={'Enter custom name (e.g., "User Query")'}
                    className="bg-background"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                    Customize this node's display name in the workflow
                </p>
            </div>

            {/* Content */}
            <div key={node.id} className="flex-1 overflow-y-auto">
                {renderConfig()}
            </div>
        </div>
    );
}
