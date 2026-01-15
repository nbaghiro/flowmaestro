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
import { getDefaultModelForProvider } from "@flowmaestro/shared";
import { generateId } from "../lib/utils";
import { useConnectionStore } from "../stores/connectionStore";
import { useThemeStore } from "../stores/themeStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { CustomEdge } from "./edges/CustomEdge";
import { nodeTypes, isProviderNodeType, getProviderInfo, AI_PROVIDER_IDS } from "./nodeTypes";

// Register edge types
const edgeTypes = {
    default: CustomEdge
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

// Default data for each node type, including preset configs for visual variants
function getDefaultData(type: string): Record<string, unknown> {
    const baseData = {
        label: getDefaultLabel(type),
        status: "idle" as const
    };

    // Add preset configs for visual variant nodes
    switch (type) {
        case "llm": {
            // Find first active LLM connection to use as default
            const connections = useConnectionStore.getState().connections;
            const activeLLMConnection = connections.find(
                (conn) => conn.status === "active" && AI_PROVIDER_IDS.includes(conn.provider)
            );

            if (activeLLMConnection) {
                return {
                    ...baseData,
                    provider: activeLLMConnection.provider,
                    connectionId: activeLLMConnection.id,
                    model: getDefaultModelForProvider(activeLLMConnection.provider)
                };
            }
            return baseData;
        }
        case "files":
            return {
                ...baseData,
                exposeAsInput: true,
                enableParsing: true,
                chunkingAlgorithm: "sentence",
                chunkOverlap: 1000,
                chunkSize: 2500,
                advancedExtraction: false,
                ocrEnabled: false,
                // Backend compatibility fields
                inputName: "files",
                outputVariable: "processedFiles",
                required: true
            };
        case "url":
            return {
                ...baseData,
                urls: [],
                // Scraping options
                scrapingMode: "html",
                scrapeSubpages: false,
                timeout: 30,
                followRedirects: true,
                // Chunking settings
                chunkingAlgorithm: "sentence",
                chunkOverlap: 1000,
                chunkSize: 2500,
                advancedExtraction: false,
                ocrEnabled: false,
                // Input/Output
                inputName: "urls",
                outputVariable: "fetchedContent",
                required: true
            };
        case "audioInput":
            return { ...baseData, inputType: "audio" };
        case "action":
            return {
                ...baseData,
                provider: "",
                operation: "",
                connectionId: "",
                parameters: {},
                outputVariable: ""
            };
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
        "shared-memory": "Shared Memory",
        embeddings: "Embeddings",
        audio: "Audio",
        router: "Router",
        imageGeneration: "Image",
        videoGeneration: "Video",
        conditional: "Conditional",
        switch: "Switch",
        loop: "Loop",
        code: "Code",
        wait: "Wait/Delay",
        humanReview: "Human Review",
        input: "Input",
        transform: "Transform",
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
        audioOutput: "Audio Output",
        templateOutput: "Template Output"
    };

    // Check if it's a provider node first
    if (isProviderNodeType(type)) {
        const provider = getProviderInfo(type);
        return provider?.displayName || type;
    }

    return labels[type] || "Node";
}
