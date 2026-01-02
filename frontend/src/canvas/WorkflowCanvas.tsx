import { useCallback, useRef } from "react";
import Flow, {
    Background,
    Controls,
    ConnectionMode,
    addEdge,
    Connection,
    BackgroundVariant,
    ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { generateId } from "../lib/utils";
import { useThemeStore } from "../stores/themeStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { CustomEdge } from "./edges/CustomEdge";
// Import all node components
import AudioNode from "./nodes/AudioNode";
import CodeNode from "./nodes/CodeNode";
import CommentNode from "./nodes/CommentNode";
import ConditionalNode from "./nodes/ConditionalNode";
import DatabaseNode from "./nodes/DatabaseNode";
import EmbeddingsNode from "./nodes/EmbeddingsNode";
import HTTPNode from "./nodes/HTTPNode";
import InputNode from "./nodes/InputNode";
import IntegrationNode from "./nodes/IntegrationNode";
import KnowledgeBaseQueryNode from "./nodes/KnowledgeBaseQueryNode";
import LLMNode from "./nodes/LLMNode";
import LoopNode from "./nodes/LoopNode";
import OutputNode from "./nodes/OutputNode";
import RouterNode from "./nodes/RouterNode";
import SwitchNode from "./nodes/SwitchNode";
import TransformNode from "./nodes/TransformNode";
import TriggerNode from "./nodes/TriggerNode";
import VariableNode from "./nodes/VariableNode";
import VisionNode from "./nodes/VisionNode";
import WaitNode from "./nodes/WaitNode";

// Register edge types
const edgeTypes = {
    default: CustomEdge
};

// AI provider IDs (these use the LLM node, not Integration node)
const AI_PROVIDER_IDS = ["openai", "anthropic", "google", "huggingface", "cohere"];

// Generate integration provider node types dynamically
// Each provider type maps to the IntegrationNode component
const integrationProviderNodeTypes: Record<string, typeof IntegrationNode> = {};
ALL_PROVIDERS.filter((p) => !p.comingSoon && !AI_PROVIDER_IDS.includes(p.provider)).forEach(
    (provider) => {
        integrationProviderNodeTypes[provider.provider] = IntegrationNode;
    }
);

// Register node types
// Note: Visual variant nodes (files, url, audioInput, action, audioOutput) use the same
// base component as their parent type (InputNode, OutputNode). The variant-specific
// config is set when the node is dropped via getDefaultData().
const nodeTypes = {
    comment: CommentNode,
    trigger: TriggerNode,
    llm: LLMNode,
    vision: VisionNode,
    audio: AudioNode,
    embeddings: EmbeddingsNode,
    router: RouterNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    input: InputNode,
    transform: TransformNode,
    variable: VariableNode,
    output: OutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
    // Visual variant nodes use base components
    files: InputNode,
    url: InputNode,
    audioInput: InputNode,
    action: OutputNode,
    audioOutput: OutputNode,
    // Integration provider nodes (dynamically generated)
    ...integrationProviderNodeTypes
};

interface WorkflowCanvasProps {
    onInit?: (instance: ReactFlowInstance) => void;
}

export function WorkflowCanvas({ onInit: onInitProp }: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const isDragging = useRef(false);

    const { nodes, edges, onNodesChange, onEdgesChange, addNode, selectNode } = useWorkflowStore();
    const effectiveTheme = useThemeStore((state) => state.effectiveTheme);

    const onConnect = useCallback(
        (connection: Connection) => {
            useWorkflowStore.setState({
                edges: addEdge(connection, edges)
            });
        },
        [edges]
    );

    const onNodeDragStart = useCallback(() => {
        // Reset flag at start of any potential drag
        isDragging.current = false;
    }, []);

    const onNodeDrag = useCallback(() => {
        // This only fires during actual dragging, not on clicks
        isDragging.current = true;
    }, []);

    const onNodeDragStop = useCallback(() => {
        // Keep the flag set briefly to ensure onClick sees it
        // Reset after 100ms to prevent blocking subsequent clicks
        setTimeout(() => {
            isDragging.current = false;
        }, 100);
    }, []);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: { id: string }) => {
            // Only select node if it wasn't actually dragged
            if (!isDragging.current) {
                selectNode(node.id);
            }
        },
        [selectNode]
    );

    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const onInit = useCallback(
        (instance: ReactFlowInstance) => {
            reactFlowInstance.current = instance;
            if (onInitProp) {
                onInitProp(instance);
            }
        },
        [onInitProp]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");
            if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
                return;
            }

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.current.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top
            });

            const newNode = {
                id: generateId(),
                type,
                position,
                data: getDefaultData(type)
            };

            addNode(newNode);
        },
        [addNode]
    );

    return (
        <div
            ref={reactFlowWrapper}
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: effectiveTheme === "dark" ? "#000000" : "#f2f2f2"
            }}
        >
            <Flow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onPaneClick={onPaneClick}
                onInit={onInit}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.05, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={12}
                    size={1}
                    color={effectiveTheme === "dark" ? "#555" : "#aaa"}
                />
                <Controls />
            </Flow>
        </div>
    );
}

// Check if a type is an integration provider node
function isProviderNodeType(type: string): boolean {
    return integrationProviderNodeTypes[type] !== undefined;
}

// Get provider info by type
function getProviderInfo(type: string) {
    return ALL_PROVIDERS.find((p) => p.provider === type);
}

// Default data for each node type, including preset configs for visual variants
function getDefaultData(type: string): Record<string, unknown> {
    const baseData = {
        label: getDefaultLabel(type),
        status: "idle" as const
    };

    // Add preset configs for visual variant nodes
    switch (type) {
        case "files":
            return { ...baseData, inputType: "file" };
        case "url":
            return { ...baseData, inputType: "url" };
        case "audioInput":
            return { ...baseData, inputType: "audio" };
        case "action":
            return { ...baseData, outputType: "action" };
        case "audioOutput":
            return { ...baseData, outputType: "audio" };
        default:
            // For provider nodes, preset the provider field and logoUrl
            if (isProviderNodeType(type)) {
                const providerInfo = getProviderInfo(type);
                return {
                    ...baseData,
                    provider: type,
                    logoUrl: providerInfo?.logoUrl
                };
            }
            return baseData;
    }
}

function getDefaultLabel(type: string): string {
    const labels: Record<string, string> = {
        trigger: "Trigger",
        llm: "LLM",
        vision: "Vision",
        audio: "Audio",
        embeddings: "Embeddings",
        router: "Router",
        conditional: "Conditional",
        switch: "Switch",
        loop: "Loop",
        code: "Code",
        wait: "Wait/Delay",
        input: "Input",
        transform: "Transform",
        variable: "Variable",
        output: "Output",
        http: "HTTP",
        database: "Database",
        integration: "Integration",
        knowledgeBaseQuery: "KB Query",
        comment: "Comment",
        // Visual variant nodes
        files: "Files",
        url: "URL",
        audioInput: "Audio Input",
        action: "Action",
        audioOutput: "Audio Output"
    };

    // Check if it's a provider node first
    if (isProviderNodeType(type)) {
        const provider = getProviderInfo(type);
        return provider?.displayName || type;
    }

    return labels[type] || "Node";
}
