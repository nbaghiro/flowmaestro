import { X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { useWorkflowStore } from "../../stores/workflowStore";
// AI & ML
import { AggregateNodeConfig } from "./configs/AggregateNodeConfig";
import { AudioNodeConfig } from "./configs/AudioNodeConfig";
// Logic & Code
import { CodeNodeConfig } from "./configs/CodeNodeConfig";
import { ConditionalNodeConfig } from "./configs/ConditionalNodeConfig";
// Data Operations
// Connect
import { DatabaseNodeConfig } from "./configs/DatabaseNodeConfig";
import { DeduplicateNodeConfig } from "./configs/DeduplicateNodeConfig";
import { EmbeddingsNodeConfig } from "./configs/EmbeddingsNodeConfig";
import { FilterNodeConfig } from "./configs/FilterNodeConfig";
import { HTTPNodeConfig } from "./configs/HTTPNodeConfig";
import { InputNodeConfig } from "./configs/InputNodeConfig";
import { IntegrationNodeConfig } from "./configs/IntegrationNodeConfig";
import { KnowledgeBaseQueryNodeConfig } from "./configs/KnowledgeBaseQueryNodeConfig";
import { LLMNodeConfig } from "./configs/LLMNodeConfig";
import { LoopNodeConfig } from "./configs/LoopNodeConfig";
import { OutputNodeConfig } from "./configs/OutputNodeConfig";
import { ParseDocumentNodeConfig } from "./configs/ParseDocumentNodeConfig";
import { ParsePDFNodeConfig } from "./configs/ParsePDFNodeConfig";
import { RouterNodeConfig } from "./configs/RouterNodeConfig";
import { SwitchNodeConfig } from "./configs/SwitchNodeConfig";
import { TransformNodeConfig } from "./configs/TransformNodeConfig";
import { VariableNodeConfig } from "./configs/VariableNodeConfig";
import { VisionNodeConfig } from "./configs/VisionNodeConfig";
import { WaitNodeConfig } from "./configs/WaitNodeConfig";

export function NodeInspector() {
    const { nodes, selectedNode, selectNode, updateNode } = useWorkflowStore();

    const node = nodes.find((n) => n.id === selectedNode);
    const [nodeName, setNodeName] = useState(node?.data.label || "");

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

    // Early return AFTER all hooks have been called
    if (!node) {
        return null;
    }

    const renderConfig = () => {
        switch (node.type) {
            // AI & ML
            case "llm":
                return <LLMNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "vision":
                return <VisionNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "audio":
                return <AudioNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "embeddings":
                return <EmbeddingsNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Logic & Code
            case "conditional":
                return <ConditionalNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "switch":
                return <SwitchNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "loop":
                return <LoopNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "router":
                return <RouterNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "code":
                return <CodeNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "wait":
                return <WaitNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Data Operations
            case "input":
                return <InputNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "transform":
                return <TransformNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "filter":
                return <FilterNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "aggregate":
                return <AggregateNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "deduplicate":
                return <DeduplicateNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "variable":
                return <VariableNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "output":
                return <OutputNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "parsePdf":
                return <ParsePDFNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "parseDocument":
                return <ParseDocumentNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Connect
            case "http":
                return <HTTPNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "database":
                return <DatabaseNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "integration":
                return <IntegrationNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "knowledgeBaseQuery":
                return <KnowledgeBaseQueryNodeConfig data={node.data} onUpdate={handleUpdate} />;

            default:
                return (
                    <div className="p-4 text-sm text-muted-foreground">
                        Configuration for {node.type} node coming soon...
                    </div>
                );
        }
    };

    return (
        <div className="w-96 bg-card border-l border-border flex flex-col h-full shadow-panel">
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
