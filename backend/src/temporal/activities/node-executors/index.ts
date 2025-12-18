import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { executeAudioNode, AudioNodeConfig, AudioNodeResult } from "./audio-executor";
import { executeCodeNode, CodeNodeConfig, CodeNodeResult } from "./code-executor";
import { executeAggregateNode, AggregateNodeConfig } from "./data-processing/aggregate-executor";
import {
    executeDeduplicateNode,
    DeduplicateNodeConfig
} from "./data-processing/deduplicate-executor";
import { executeFilterNode, FilterNodeConfig } from "./data-processing/filter-executor";
import {
    executeTransformNode,
    TransformNodeConfig,
    TransformNodeResult
} from "./data-processing/transform-executor";
import { executeDatabaseNode, DatabaseNodeConfig, DatabaseNodeResult } from "./database-executor";
import { executeEchoNode, EchoNodeConfig, EchoNodeResult } from "./echo-executor";
import {
    executeEmbeddingsNode,
    EmbeddingsNodeConfig,
    EmbeddingsNodeResult
} from "./embeddings-executor";
import {
    executeFileOperationsNode,
    FileOperationsNodeConfig,
    FileOperationsNodeResult
} from "./file-executor";
import {
    executeParseDocumentNode,
    ParseDocumentNodeConfig
} from "./file-processing/parse-document-executor";
import { executeParsePdfNode, ParsePdfNodeConfig } from "./file-processing/parse-pdf-executor";
import {
    executeConditionalNode,
    ConditionalNodeConfig,
    ConditionalNodeResult
} from "./flow-control/conditional-executor";
import { executeLoopNode, LoopNodeConfig, LoopNodeResult } from "./flow-control/loop-executor";
import { executeOutputNode, OutputNodeConfig } from "./flow-control/output-executor";
import { executeRouterNode, RouterNodeConfig } from "./flow-control/router-executor";
import {
    executeSwitchNode,
    SwitchNodeConfig,
    SwitchNodeResult
} from "./flow-control/switch-executor";
import { executeWaitNode, WaitNodeConfig, WaitNodeResult } from "./flow-control/wait-executor";
import { executeHTTPNode, HTTPNodeConfig, HTTPNodeResult } from "./http-executor";
import {
    executeIntegrationNode,
    IntegrationNodeConfig,
    IntegrationNodeResult
} from "./integration-executor";
import { executeKnowledgeBaseQueryNode, KnowledgeBaseQueryNodeConfig } from "./kb-query-executor";
import { executeLLMNode, LLMNodeConfig, LLMNodeResult } from "./llm-executor";
import { executeVariableNode, VariableNodeConfig, VariableNodeResult } from "./variable-executor";
import { executeVisionNode, VisionNodeConfig, VisionNodeResult } from "./vision-executor";

export type NodeConfig =
    | { type: "http"; config: HTTPNodeConfig }
    | { type: "llm"; config: LLMNodeConfig }
    | { type: "transform"; config: TransformNodeConfig }
    | { type: "fileOperations"; config: FileOperationsNodeConfig }
    | { type: "variable"; config: VariableNodeConfig }
    | { type: "output"; config: OutputNodeConfig }
    | { type: "input"; config: JsonObject } // Input is handled differently
    | { type: string; config: JsonObject } // Other node types not yet implemented
    | { type: "filter"; config: FilterNodeConfig }
    | { type: "router"; config: RouterNodeConfig }
    | { type: "aggregate"; config: AggregateNodeConfig }
    | { type: "deduplicate"; config: DeduplicateNodeConfig };

export type NodeResult =
    | HTTPNodeResult
    | LLMNodeResult
    | TransformNodeResult
    | FileOperationsNodeResult
    | VariableNodeResult
    | { outputs: JsonObject };

export interface ExecuteNodeInput {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    globalStore?: Map<string, JsonValue>;
}

/**
 * Main node executor - routes to appropriate node type executor
 */
export async function executeNode(input: ExecuteNodeInput): Promise<JsonObject> {
    const { nodeType, nodeConfig, context, globalStore } = input;

    console.log(`[NodeExecutor] Executing ${nodeType} node`);

    switch (nodeType) {
        case "http":
            return await executeHTTPNode(nodeConfig as unknown as HTTPNodeConfig, context);

        case "llm":
            return await executeLLMNode(nodeConfig as unknown as LLMNodeConfig, context);

        case "transform":
            return await executeTransformNode(
                nodeConfig as unknown as TransformNodeConfig,
                context
            );
        case "filter":
            return await executeFilterNode(nodeConfig as unknown as FilterNodeConfig, context);

        case "aggregate":
            return await executeAggregateNode(
                nodeConfig as unknown as AggregateNodeConfig,
                context
            );

        case "deduplicate":
            return await executeDeduplicateNode(
                nodeConfig as unknown as DeduplicateNodeConfig,
                context
            );

        case "fileOperations":
            return await executeFileOperationsNode(
                nodeConfig as unknown as FileOperationsNodeConfig,
                context
            );

        case "variable":
            return await executeVariableNode(
                nodeConfig as unknown as VariableNodeConfig,
                context,
                globalStore
            );

        case "output":
            return await executeOutputNode(nodeConfig as unknown as OutputNodeConfig, context);

        case "input": {
            // Input nodes are handled at workflow start
            console.log("[NodeExecutor] Input node - returning stored input value");
            const inputName =
                typeof nodeConfig.inputName === "string" ? nodeConfig.inputName : "input";
            return { [inputName]: context[inputName] } as unknown as JsonObject;
        }

        case "conditional":
        case "loop":
            // Control flow nodes are handled by the workflow orchestrator
            throw new Error(`${nodeType} nodes must be handled by workflow orchestrator`);

        case "router":
            return await executeRouterNode(nodeConfig as unknown as RouterNodeConfig, context);

        case "switch":
            return await executeSwitchNode(nodeConfig as unknown as SwitchNodeConfig, context);

        case "echo":
            return await executeEchoNode(nodeConfig as unknown as EchoNodeConfig, context);

        case "wait":
            return await executeWaitNode(nodeConfig as unknown as WaitNodeConfig, context);

        case "code":
            return await executeCodeNode(nodeConfig as unknown as CodeNodeConfig, context);

        case "vision":
            return await executeVisionNode(nodeConfig as unknown as VisionNodeConfig, context);

        case "audio":
            return await executeAudioNode(nodeConfig as unknown as AudioNodeConfig, context);

        case "embeddings":
            return await executeEmbeddingsNode(
                nodeConfig as unknown as EmbeddingsNodeConfig,
                context
            );

        case "database":
            return await executeDatabaseNode(nodeConfig as unknown as DatabaseNodeConfig, context);

        case "integration":
            return await executeIntegrationNode(
                nodeConfig as unknown as IntegrationNodeConfig,
                context
            );

        case "knowledgeBaseQuery":
            return await executeKnowledgeBaseQueryNode({
                nodeType,
                nodeConfig,
                context
            });

        case "parsePdf":
            return await executeParsePdfNode(nodeConfig as unknown as ParsePdfNodeConfig, context);

        case "parseDocument":
            return await executeParseDocumentNode(
                nodeConfig as unknown as ParseDocumentNodeConfig,
                context
            );

        default:
            throw new Error(`Node type '${nodeType}' not yet implemented`);
    }
}

// Export all executors
export {
    executeHTTPNode,
    executeLLMNode,
    executeTransformNode,
    executeFileOperationsNode,
    executeVariableNode,
    executeOutputNode,
    executeConditionalNode,
    executeSwitchNode,
    executeLoopNode,
    executeEchoNode,
    executeWaitNode,
    executeCodeNode,
    executeVisionNode,
    executeAudioNode,
    executeEmbeddingsNode,
    executeDatabaseNode,
    executeIntegrationNode,
    executeKnowledgeBaseQueryNode
};

// Export types
export type {
    HTTPNodeConfig,
    HTTPNodeResult,
    LLMNodeConfig,
    LLMNodeResult,
    TransformNodeConfig,
    TransformNodeResult,
    FileOperationsNodeConfig,
    FileOperationsNodeResult,
    VariableNodeConfig,
    VariableNodeResult,
    OutputNodeConfig,
    ConditionalNodeConfig,
    ConditionalNodeResult,
    SwitchNodeConfig,
    SwitchNodeResult,
    LoopNodeConfig,
    LoopNodeResult,
    EchoNodeConfig,
    EchoNodeResult,
    WaitNodeConfig,
    WaitNodeResult,
    CodeNodeConfig,
    CodeNodeResult,
    VisionNodeConfig,
    VisionNodeResult,
    AudioNodeConfig,
    AudioNodeResult,
    EmbeddingsNodeConfig,
    EmbeddingsNodeResult,
    DatabaseNodeConfig,
    DatabaseNodeResult,
    IntegrationNodeConfig,
    IntegrationNodeResult,
    KnowledgeBaseQueryNodeConfig
};
