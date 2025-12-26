/**
 * Node Executors Index
 * Central export point for all node executor functions
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../shared/logger";

const logger = createActivityLogger({ nodeType: "NodeExecutor" });
import { executeAudioNode, AudioNodeConfig, AudioNodeResult } from "./ai/audio";
import { executeEmbeddingsNode, EmbeddingsNodeConfig, EmbeddingsNodeResult } from "./ai/embeddings";
import { executeLLMNode, LLMNodeConfig, LLMNodeResult } from "./ai/llm";
import { executeVisionNode, VisionNodeConfig, VisionNodeResult } from "./ai/vision";
import { executeEchoNode, EchoNodeConfig, EchoNodeResult } from "./data/echo";
import { executeOutputNode, OutputNodeConfig } from "./data/output";
import { executeTransformNode, TransformNodeConfig, TransformNodeResult } from "./data/transform";
import { executeVariableNode, VariableNodeConfig, VariableNodeResult } from "./data/variable";
import { executeCodeNode, CodeNodeConfig, CodeNodeResult } from "./integrations/code";
import {
    executeDatabaseNode,
    DatabaseNodeConfig,
    DatabaseNodeResult
} from "./integrations/database";
import {
    executeFileOperationsNode,
    FileOperationsNodeConfig,
    FileOperationsNodeResult
} from "./integrations/file";
import { executeHTTPNode, HTTPNodeConfig, HTTPNodeResult } from "./integrations/http";
import {
    executeIntegrationNode,
    IntegrationNodeConfig,
    IntegrationNodeResult
} from "./integrations/integration";
import {
    executeKnowledgeBaseQueryNode,
    KnowledgeBaseQueryNodeConfig
} from "./integrations/kb-query";
import {
    executeConditionalNode,
    ConditionalNodeConfig,
    ConditionalNodeResult
} from "./logic/conditional";
import { executeLoopNode, LoopNodeConfig, LoopNodeResult } from "./logic/loop";
import { executeSwitchNode, SwitchNodeConfig, SwitchNodeResult } from "./logic/switch";
import { executeWaitNode, WaitNodeConfig, WaitNodeResult } from "./logic/wait";

export type NodeConfig =
    | { type: "http"; config: HTTPNodeConfig }
    | { type: "llm"; config: LLMNodeConfig }
    | { type: "transform"; config: TransformNodeConfig }
    | { type: "fileOperations"; config: FileOperationsNodeConfig }
    | { type: "variable"; config: VariableNodeConfig }
    | { type: "output"; config: OutputNodeConfig }
    | { type: "input"; config: JsonObject } // Input is handled differently
    | { type: string; config: JsonObject }; // Other node types not yet implemented

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

    logger.info("Executing node", { nodeType });

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
            logger.debug("Input node - returning stored input value");
            const inputName =
                typeof nodeConfig.inputName === "string" ? nodeConfig.inputName : "input";
            return { [inputName]: context[inputName] } as unknown as JsonObject;
        }

        case "conditional":
        case "switch":
        case "loop":
            // Control flow nodes are handled by the workflow orchestrator
            throw new Error(`${nodeType} nodes must be handled by workflow orchestrator`);

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

        default:
            throw new Error(`Node type '${nodeType}' not yet implemented`);
    }
}

// Export all executors
export {
    // AI executors
    executeAudioNode,
    executeEmbeddingsNode,
    executeLLMNode,
    executeVisionNode,
    // Logic executors
    executeConditionalNode,
    executeLoopNode,
    executeSwitchNode,
    executeWaitNode,
    // Data executors
    executeEchoNode,
    executeOutputNode,
    executeTransformNode,
    executeVariableNode,
    // Integration executors
    executeCodeNode,
    executeDatabaseNode,
    executeFileOperationsNode,
    executeHTTPNode,
    executeIntegrationNode,
    executeKnowledgeBaseQueryNode
};

// Export types
export type {
    // AI types
    AudioNodeConfig,
    AudioNodeResult,
    EmbeddingsNodeConfig,
    EmbeddingsNodeResult,
    LLMNodeConfig,
    LLMNodeResult,
    VisionNodeConfig,
    VisionNodeResult,
    // Logic types
    ConditionalNodeConfig,
    ConditionalNodeResult,
    LoopNodeConfig,
    LoopNodeResult,
    SwitchNodeConfig,
    SwitchNodeResult,
    WaitNodeConfig,
    WaitNodeResult,
    // Data types
    EchoNodeConfig,
    EchoNodeResult,
    OutputNodeConfig,
    TransformNodeConfig,
    TransformNodeResult,
    VariableNodeConfig,
    VariableNodeResult,
    // Integration types
    CodeNodeConfig,
    CodeNodeResult,
    DatabaseNodeConfig,
    DatabaseNodeResult,
    FileOperationsNodeConfig,
    FileOperationsNodeResult,
    HTTPNodeConfig,
    HTTPNodeResult,
    IntegrationNodeConfig,
    IntegrationNodeResult,
    KnowledgeBaseQueryNodeConfig
};
