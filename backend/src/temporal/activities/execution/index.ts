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
    type RouterNodeResult
} from "./handlers/ai";

// ============================================================================
// DATA HANDLERS
// ============================================================================

export {
    // Transform
    executeTransformNode,
    TransformNodeHandler,
    createTransformNodeHandler,
    type TransformNodeConfig,
    type TransformNodeResult,
    // Variable
    executeVariableNode,
    VariableNodeHandler,
    createVariableNodeHandler,
    type VariableNodeConfig,
    type VariableNodeResult,
    // Output
    executeOutputNode,
    OutputNodeHandler,
    createOutputNodeHandler,
    type OutputNodeConfig,
    type OutputNodeResult
} from "./handlers/data";

// ============================================================================
// INTEGRATION HANDLERS
// ============================================================================

export {
    // HTTP
    executeHTTPNode,
    HTTPNodeHandler,
    createHTTPNodeHandler,
    type HTTPNodeConfig,
    type HTTPNodeResult,
    // Code
    executeCodeNode,
    CodeNodeHandler,
    createCodeNodeHandler,
    type CodeNodeConfig,
    type CodeNodeResult,
    // Database
    executeDatabaseNode,
    closeDatabaseConnections,
    DatabaseNodeHandler,
    createDatabaseNodeHandler,
    type DatabaseNodeConfig,
    type DatabaseNodeResult,
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
    type IntegrationNodeResult,
    // Knowledge Base Query
    executeKnowledgeBaseQueryNode,
    KnowledgeBaseQueryNodeHandler,
    createKnowledgeBaseQueryNodeHandler,
    type KnowledgeBaseQueryNodeConfig,
    type KnowledgeBaseQueryNodeResult
} from "./handlers/integrations";

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
    type WaitNodeResult
} from "./handlers/logic";

// ============================================================================
// CONTROL HANDLERS
// ============================================================================

export {
    // Input
    executeInputNode,
    InputNodeHandler,
    createInputNodeHandler,
    type InputNodeConfig,
    type InputNodeResult
} from "./handlers/control";

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

// AI
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createContext, type ContextSnapshot } from "../../core";
import {
    createGenericNodeHandler,
    createPassThroughNodeHandler,
    createNoOpNodeHandler
} from "./generic";
import {
    createLLMNodeHandler,
    createVisionNodeHandler,
    createAudioNodeHandler,
    createEmbeddingsNodeHandler,
    createRouterNodeHandler
} from "./handlers/ai";
// Control
import { createInputNodeHandler } from "./handlers/control";
// Data
import {
    createTransformNodeHandler,
    createVariableNodeHandler,
    createOutputNodeHandler
} from "./handlers/data";
// Integrations
import {
    createHTTPNodeHandler,
    createCodeNodeHandler,
    createDatabaseNodeHandler,
    createFileOperationsNodeHandler,
    createIntegrationNodeHandler,
    createKnowledgeBaseQueryNodeHandler
} from "./handlers/integrations";
// Logic
import {
    createConditionalNodeHandler,
    createSwitchNodeHandler,
    createLoopNodeHandler,
    createWaitNodeHandler
} from "./handlers/logic";

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

    // Data handlers (priority 20-29)
    registerHandler(createTransformNodeHandler(), "data", 20);
    registerHandler(createVariableNodeHandler(), "data", 21);
    registerHandler(createOutputNodeHandler(), "data", 22);

    // Integration handlers (priority 30-39)
    registerHandler(createHTTPNodeHandler(), "integration", 30);
    registerHandler(createCodeNodeHandler(), "integration", 31);
    registerHandler(createDatabaseNodeHandler(), "integration", 32);
    registerHandler(createFileOperationsNodeHandler(), "integration", 33);
    registerHandler(createIntegrationNodeHandler(), "integration", 34);
    registerHandler(createKnowledgeBaseQueryNodeHandler(), "integration", 35);

    // Logic handlers (priority 40-49)
    registerHandler(createConditionalNodeHandler(), "logic", 40);
    registerHandler(createSwitchNodeHandler(), "logic", 41);
    registerHandler(createLoopNodeHandler(), "logic", 42);
    registerHandler(createWaitNodeHandler(), "control", 43);
    registerHandler(createInputNodeHandler(), "control", 44);

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
 * Execute a node using the handler registry.
 * This is a backwards-compatible wrapper around executeWithRegistry.
 */
export async function executeNode(input: ExecuteNodeInput): Promise<JsonObject> {
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

    return output.result;
}

// ============================================================================
// AUTO-REGISTER HANDLERS ON MODULE LOAD
// ============================================================================

// Register all default handlers when this module is imported
registerDefaultHandlers();
