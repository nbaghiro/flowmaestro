/**
 * Execution Module
 *
 * Consolidated exports for the node handler execution system.
 * Includes types, registry, and all node handlers.
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
    // Signals
    LoopMetadata,
    PauseContext,
    ExecutionSignals,
    // Handler types
    NodeExecutionMetadata,
    NodeHandlerInput,
    TokenUsage,
    NodeExecutionMetrics,
    NodeHandlerOutput,
    NodeHandler,
    NodeHandlerFactory,
    NodeHandlerCategory,
    HandlerRegistration
} from "./types";

export { BaseNodeHandler } from "./types";

// ============================================================================
// REGISTRY
// ============================================================================

export {
    // Registration
    registerHandler,
    registerHandlerFactory,
    // Lookup
    findHandler,
    getHandler,
    hasHandler,
    // Query
    getAllHandlers,
    getHandlersByCategory,
    getSupportedNodeTypes,
    // Management
    clearHandlers,
    unregisterHandler,
    // Execution
    executeWithRegistry,
    // Statistics
    getRegistryStats
} from "./registry";

// ============================================================================
// AI HANDLERS
// ============================================================================

export {
    // LLM
    executeLLMNode,
    LLMNodeHandler,
    createLLMNodeHandler,
    type LLMNodeConfig,
    type LLMNodeResult,
    type LLMExecutionCallbacks,
    // Vision
    executeVisionNode,
    VisionNodeHandler,
    createVisionNodeHandler,
    type VisionNodeConfig,
    type VisionNodeResult,
    // Audio
    executeAudioNode,
    AudioNodeHandler,
    createAudioNodeHandler,
    type AudioNodeConfig,
    type AudioNodeResult,
    // Embeddings
    executeEmbeddingsNode,
    EmbeddingsNodeHandler,
    createEmbeddingsNodeHandler,
    type EmbeddingsNodeConfig,
    type EmbeddingsNodeResult,
    // Router
    executeRouterNode,
    RouterNodeHandler,
    createRouterNodeHandler,
    type RouterNodeConfig,
    type RouterNodeResult,
    // Knowledge Base Query
    executeKnowledgeBaseQueryNode,
    KnowledgeBaseQueryNodeHandler,
    createKnowledgeBaseQueryNodeHandler,
    type KnowledgeBaseQueryNodeConfig,
    type KnowledgeBaseQueryNodeResult
} from "./handlers/ai";

// ============================================================================
// INPUTS HANDLERS
// ============================================================================

export {
    // Input
    InputNodeHandler,
    createInputNodeHandler,
    type InputNodeConfig,
    type InputNodeResult,
    // Files
    FilesNodeHandler,
    createFilesNodeHandler,
    type FilesNodeConfig,
    // URL
    URLNodeHandler,
    createURLNodeHandler,
    type URLNodeConfig,
    type URLNodeResult,
    type FetchedURL,
    // Audio Input (STT)
    AudioInputNodeHandler,
    createAudioInputNodeHandler,
    type AudioInputNodeConfig,
    type AudioInputNodeResult,
    type AudioInputData
} from "./handlers/inputs";

// ============================================================================
// OUTPUTS HANDLERS
// ============================================================================

export {
    // Output
    executeOutputNode,
    OutputNodeHandler,
    createOutputNodeHandler,
    type OutputNodeConfig,
    type OutputNodeResult,
    // Action
    executeActionNode,
    ActionNodeHandler,
    createActionNodeHandler,
    type ActionNodeConfig,
    type ActionNodeResult,
    // Audio Output (TTS)
    AudioOutputNodeHandler,
    createAudioOutputNodeHandler,
    type AudioOutputNodeConfig,
    type AudioOutputNodeResult,
    // Template Output
    TemplateOutputNodeHandler,
    createTemplateOutputNodeHandler,
    type TemplateOutputNodeConfig,
    type TemplateOutputNodeResult
} from "./handlers/outputs";

// ============================================================================
// LOGIC HANDLERS
// ============================================================================

export {
    // Conditional
    executeConditionalNode,
    ConditionalNodeHandler,
    createConditionalNodeHandler,
    type ConditionalNodeConfig,
    type ConditionalNodeResult,
    type ComparisonOperator,
    // Switch
    executeSwitchNode,
    SwitchNodeHandler,
    createSwitchNodeHandler,
    type SwitchNodeConfig,
    type SwitchNodeResult,
    // Loop
    executeLoopNode,
    LoopNodeHandler,
    createLoopNodeHandler,
    type LoopNodeConfig,
    type LoopNodeResult,
    // Wait
    executeWaitNode,
    WaitNodeHandler,
    createWaitNodeHandler,
    type WaitNodeConfig,
    type WaitNodeResult,
    // Human Review
    HumanReviewNodeHandler,
    createHumanReviewNodeHandler,
    type HumanReviewNodeConfig,
    type HumanReviewNodeResult,
    // Transform
    executeTransformNode,
    TransformNodeHandler,
    createTransformNodeHandler,
    type TransformNodeConfig,
    type TransformNodeResult,
    // Shared Memory
    executeSharedMemoryWithContext,
    SharedMemoryNodeHandler,
    createSharedMemoryNodeHandler,
    type SharedMemoryNodeConfig,
    type SharedMemoryNodeResult,
    // Code
    executeCodeNode,
    CodeNodeHandler,
    createCodeNodeHandler,
    type CodeNodeConfig,
    type CodeNodeResult
} from "./handlers/logic";

// ============================================================================
// UTILS HANDLERS
// ============================================================================

export {
    // HTTP
    executeHTTPNode,
    HTTPNodeHandler,
    createHTTPNodeHandler,
    type HTTPNodeConfig,
    type HTTPNodeResult,
    // Database
    executeDatabaseNode,
    closeDatabaseConnections,
    DatabaseNodeHandler,
    createDatabaseNodeHandler,
    type DatabaseNodeConfig,
    type DatabaseNodeResult
} from "./handlers/utils";

// ============================================================================
// INTEGRATION HANDLERS
// ============================================================================

export {
    // File Operations
    executeFileOperationsNode,
    FileOperationsNodeHandler,
    createFileOperationsNodeHandler,
    type FileOperationsNodeConfig,
    type FileOperationsNodeResult,
    // Integration
    executeIntegrationNode,
    IntegrationNodeHandler,
    createIntegrationNodeHandler,
    type IntegrationNodeConfig,
    type IntegrationNodeResult
} from "./handlers/integrations";

// ============================================================================
// GENERIC HANDLERS
// ============================================================================

export {
    GenericNodeHandler,
    PassThroughNodeHandler,
    NoOpNodeHandler,
    createGenericNodeHandler,
    createPassThroughNodeHandler,
    createNoOpNodeHandler
} from "./generic";

// ============================================================================
// HANDLER REGISTRATION HELPER
// ============================================================================

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createContext, type ContextSnapshot } from "../../core";
import {
    createGenericNodeHandler,
    createPassThroughNodeHandler,
    createNoOpNodeHandler
} from "./generic";
// AI
import {
    createLLMNodeHandler,
    createVisionNodeHandler,
    createAudioNodeHandler,
    createEmbeddingsNodeHandler,
    createRouterNodeHandler,
    createKnowledgeBaseQueryNodeHandler
} from "./handlers/ai";
// Inputs
import {
    createInputNodeHandler,
    createFilesNodeHandler,
    createURLNodeHandler,
    createAudioInputNodeHandler
} from "./handlers/inputs";
// Outputs
import {
    createFileOperationsNodeHandler,
    createIntegrationNodeHandler
} from "./handlers/integrations";
import {
    createConditionalNodeHandler,
    createSwitchNodeHandler,
    createLoopNodeHandler,
    createWaitNodeHandler,
    createHumanReviewNodeHandler,
    createTransformNodeHandler,
    createSharedMemoryNodeHandler,
    createCodeNodeHandler
} from "./handlers/logic";
import {
    createOutputNodeHandler,
    createActionNodeHandler,
    createAudioOutputNodeHandler,
    createTemplateOutputNodeHandler
} from "./handlers/outputs";
// Logic
// Utils
import { createHTTPNodeHandler, createDatabaseNodeHandler } from "./handlers/utils";
// Integrations

/**
 * Register all default handlers with the registry.
 * Call this during worker initialization.
 */
export function registerDefaultHandlers(): void {
    // AI handlers (priority 10-19)
    registerHandler(createLLMNodeHandler(), "ai", 10);
    registerHandler(createVisionNodeHandler(), "ai", 11);
    registerHandler(createAudioNodeHandler(), "ai", 12);
    registerHandler(createEmbeddingsNodeHandler(), "ai", 13);
    registerHandler(createRouterNodeHandler(), "ai", 14);
    registerHandler(createKnowledgeBaseQueryNodeHandler(), "ai", 15);

    // Inputs handlers (priority 20-29)
    registerHandler(createInputNodeHandler(), "inputs", 20);
    registerHandler(createFilesNodeHandler(), "inputs", 21);
    registerHandler(createURLNodeHandler(), "inputs", 22);
    registerHandler(createAudioInputNodeHandler(), "inputs", 23);

    // Outputs handlers (priority 30-39)
    registerHandler(createOutputNodeHandler(), "outputs", 30);
    registerHandler(createActionNodeHandler(), "outputs", 31);
    registerHandler(createAudioOutputNodeHandler(), "outputs", 32);
    registerHandler(createTemplateOutputNodeHandler(), "outputs", 33);

    // Logic handlers (priority 40-49)
    registerHandler(createConditionalNodeHandler(), "logic", 40);
    registerHandler(createSwitchNodeHandler(), "logic", 41);
    registerHandler(createLoopNodeHandler(), "logic", 42);
    registerHandler(createWaitNodeHandler(), "logic", 43);
    registerHandler(createHumanReviewNodeHandler(), "ai", 15);
    registerHandler(createTransformNodeHandler(), "logic", 45);
    registerHandler(createSharedMemoryNodeHandler(), "ai", 16);
    registerHandler(createCodeNodeHandler(), "logic", 47);

    // Utils handlers (priority 50-59)
    registerHandler(createHTTPNodeHandler(), "utils", 50);
    registerHandler(createDatabaseNodeHandler(), "utils", 51);

    // Integration handlers (priority 60-69)
    registerHandler(createFileOperationsNodeHandler(), "integrations", 60);
    registerHandler(createIntegrationNodeHandler(), "integrations", 61);

    // Pass-through handlers (priority 90)
    registerHandler(createPassThroughNodeHandler(), "generic", 90);
    registerHandler(createNoOpNodeHandler(), "generic", 91);

    // Generic fallback handler (priority 999 - always last)
    registerHandler(createGenericNodeHandler(), "generic", 999);
}

// ============================================================================
// BACKWARDS-COMPATIBLE EXECUTOR
// ============================================================================

import { registerHandler, executeWithRegistry as executeRegistry } from "./registry";

/**
 * Execution context for node execution (backwards-compatible type).
 */
export interface ExecutionContext {
    executionId: string;
    workflowName?: string;
    userId?: string;
    nodeId?: string;
}

/**
 * Input for node execution (backwards-compatible type).
 */
export interface ExecuteNodeInput {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    globalStore?: Map<string, JsonValue>;
    executionContext?: ExecutionContext;
}

/**
 * Result from node execution (backwards-compatible type).
 */
export type NodeResult = JsonObject;

/**
 * Full result from node execution including signals for workflow control.
 */
export interface NodeExecutionResult {
    /** The output data from the node */
    result: JsonObject;
    /** Signals for workflow control (pause, skip branches, etc.) */
    signals: {
        pause?: boolean;
        pauseContext?: {
            reason: string;
            nodeId: string;
            pausedAt: number;
            resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
            timeoutMs?: number;
            preservedData?: JsonObject;
        };
        branchesToSkip?: string[];
        selectedRoute?: string;
    };
    /** Execution metrics */
    metrics?: {
        durationMs?: number;
    };
}

/**
 * Execute a node using the handler registry.
 * Returns full output including signals for workflow control.
 */
export async function executeNode(input: ExecuteNodeInput): Promise<NodeExecutionResult> {
    const { nodeType, nodeConfig, context, executionContext } = input;

    // Create a context snapshot from the plain context object
    const contextSnapshot: ContextSnapshot = createContext(context);

    // Build handler input
    const handlerInput = {
        nodeType,
        nodeConfig,
        context: contextSnapshot,
        metadata: {
            executionId: executionContext?.executionId || "unknown",
            workflowName: executionContext?.workflowName,
            userId: executionContext?.userId,
            nodeId: executionContext?.nodeId || "unknown"
        }
    };

    // Execute using registry
    const output = await executeRegistry(handlerInput);

    // Return full result including signals
    return {
        result: output.result,
        signals: output.signals || {},
        metrics: output.metrics
    };
}

// ============================================================================
// AUTO-REGISTER HANDLERS ON MODULE LOAD
// ============================================================================

// Register all default handlers when this module is imported
registerDefaultHandlers();
