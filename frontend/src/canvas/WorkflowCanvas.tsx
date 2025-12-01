import { useCallback, useRef } from "react";
import Flow, {
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
    addEdge,
    Connection,
    BackgroundVariant,
    ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { generateId } from "../lib/utils";
import { useWorkflowStore } from "../stores/workflowStore";
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
import SwitchNode from "./nodes/SwitchNode";
import TransformNode from "./nodes/TransformNode";
import VariableNode from "./nodes/VariableNode";
import VisionNode from "./nodes/VisionNode";
import { VoiceGreetNode } from "./nodes/VoiceGreetNode";
import { VoiceHangupNode } from "./nodes/VoiceHangupNode";
import { VoiceListenNode } from "./nodes/VoiceListenNode";
import { VoiceMenuNode } from "./nodes/VoiceMenuNode";
import WaitNode from "./nodes/WaitNode";

// Register node types
const nodeTypes = {
    comment: CommentNode,
    llm: LLMNode,
    vision: VisionNode,
    audio: AudioNode,
    embeddings: EmbeddingsNode,
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
    voice_greet: VoiceGreetNode,
    voice_listen: VoiceListenNode,
    voice_menu: VoiceMenuNode,
    voice_hangup: VoiceHangupNode
};

interface WorkflowCanvasProps {
    onInit?: (instance: ReactFlowInstance) => void;
}

export function WorkflowCanvas({ onInit: onInitProp }: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const isDragging = useRef(false);

    const { nodes, edges, onNodesChange, onEdgesChange, addNode, selectNode } = useWorkflowStore();

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
                data: {
                    label: getDefaultLabel(type),
                    status: "idle" as const
                }
            };

            addNode(newNode);
        },
        [addNode]
    );

    return (
        <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
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
                connectionMode={ConnectionMode.Loose}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
                <MiniMap
                    className="!absolute !bottom-4 !right-4"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                        border: "1px solid rgba(0, 0, 0, 0.1)"
                    }}
                    nodeColor="#9ca3af"
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </Flow>
        </div>
    );
}

function getDefaultLabel(type: string): string {
    const labels: Record<string, string> = {
        llm: "LLM",
        vision: "Vision",
        audio: "Audio",
        embeddings: "Embeddings",
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
        integration: "Integration"
    };
    return labels[type] || "Node";
}
