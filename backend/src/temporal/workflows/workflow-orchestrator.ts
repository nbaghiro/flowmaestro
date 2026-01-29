import { proxyActivities } from "@temporalio/workflow";
import type { WorkflowDefinition, WorkflowNode, JsonObject, JsonValue } from "@flowmaestro/shared";

// Direct imports from specific files (avoids barrel file dependency issues)
import { buildWorkflow, getWorkflowSummary } from "../activities/execution/builder";
import { ACTIVITY_TIMEOUTS, RETRY_POLICIES } from "../core/constants";
import {
    // Queue functions
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    markSkipped,
    isExecutionComplete,
    getExecutionSummary,
    getExecutionProgress,
    // Context functions
    createContext,
    storeNodeOutput,
    setVariable,
    getExecutionContext,
    buildFinalOutputs
} from "../core/services/context";
import { SpanType } from "../core/types";
import { createWorkflowLogger } from "../core/workflow-logger";
import type * as activities from "../activities";
import type { BuiltWorkflow, ExecutableNode, TypedEdge } from "../activities/execution/types";
import type { ContextSnapshot } from "../core/types";

// Re-export WorkflowDefinition for use by other workflow files
export type { WorkflowDefinition, WorkflowNode };

// Node execution and span activities (long-running, with retries)
const { executeNode, createSpan, endSpan } = proxyActivities<typeof activities>({
    startToCloseTimeout: ACTIVITY_TIMEOUTS.LONG_RUNNING,
    retry: RETRY_POLICIES.DEFAULT
});

// Validation activities (fast, no retry - validation is deterministic)
const { validateInputsActivity, validateOutputsActivity } = proxyActivities<typeof activities>({
    startToCloseTimeout: ACTIVITY_TIMEOUTS.VALIDATION,
    retry: RETRY_POLICIES.NO_RETRY
});

// Event emission activities (fire-and-forget, no retry)
const {
    emitExecutionStarted,
    emitExecutionProgress,
    emitExecutionCompleted,
    emitExecutionFailed,
    emitExecutionPaused,
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: ACTIVITY_TIMEOUTS.EVENTS,
    retry: RETRY_POLICIES.NO_RETRY
});

// Credit activities (fast, with retry for database operations)
const {
    shouldAllowExecution,
    reserveCredits,
    releaseCredits,
    finalizeCredits,
    estimateWorkflowCredits,
    calculateLLMCredits,
    calculateNodeCredits
} = proxyActivities<typeof activities>({
    startToCloseTimeout: ACTIVITY_TIMEOUTS.VALIDATION,
    retry: RETRY_POLICIES.DEFAULT
});

export interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
    /** Workspace ID for credit tracking and multi-tenancy */
    workspaceId?: string;
    /** Skip credit check (for system/internal executions) */
    skipCreditCheck?: boolean;
}

export interface OrchestratorResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
}

/**
 * Main workflow orchestrator - executes a workflow definition with parallel execution
 *
 * Uses the 4-stage workflow builder to construct an execution plan:
 * 1. PathConstructor: BFS reachability from trigger
 * 2. LoopConstructor: Insert loop sentinel nodes
 * 3. NodeConstructor: Expand parallel nodes
 * 4. EdgeConstructor: Wire edges with handle types
 *
 * Then executes nodes in parallel batches using ExecutionQueue.
 */
export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const {
        executionId,
        workflowDefinition,
        inputs = {},
        userId,
        workspaceId,
        skipCreditCheck
    } = input;

    // Create workflow logger
    const logger = createWorkflowLogger({
        executionId,
        workflowName: workflowDefinition.name || "Unnamed Workflow",
        userId
    });

    const workflowStartTime = Date.now();

    // Credit tracking state
    let reservedCredits = 0;
    let accumulatedCredits = 0;
    const nodeCredits: Map<string, number> = new Map();

    // Create WORKFLOW_RUN span for entire workflow execution
    const workflowRunContext = await createSpan({
        traceId: executionId,
        parentSpanId: undefined,
        name: `Workflow: ${workflowDefinition.name || "Unnamed"}`,
        spanType: SpanType.WORKFLOW_RUN,
        entityId: executionId,
        input: {
            workflowName: workflowDefinition.name,
            inputs
        },
        attributes: {
            userId,
            workflowName: workflowDefinition.name,
            nodeCount: Object.keys(workflowDefinition.nodes).length,
            edgeCount: workflowDefinition.edges.length
        }
    });
    const workflowRunSpanId = workflowRunContext.spanId;

    try {
        // =========================================================================
        // PHASE 0: CREDIT CHECK & RESERVATION
        // =========================================================================
        if (!skipCreditCheck && workspaceId) {
            logger.info("Checking credits for workflow execution");

            // Estimate credits needed
            const estimate = await estimateWorkflowCredits({ workflowDefinition });
            const estimatedCredits = Math.ceil(estimate.totalCredits * 1.2); // 20% buffer

            logger.info("Credit estimate", {
                totalCredits: estimate.totalCredits,
                withBuffer: estimatedCredits
            });

            // Check if execution should be allowed (with grace period)
            const allowed = await shouldAllowExecution({
                workspaceId,
                estimatedCredits
            });

            if (!allowed) {
                const errorMessage = `Insufficient credits for workflow execution. Estimated need: ${estimatedCredits} credits`;
                logger.warn("Insufficient credits", { estimatedCredits });

                await emitExecutionFailed({ executionId, error: errorMessage });
                await endSpan({
                    spanId: workflowRunSpanId,
                    error: new Error(errorMessage),
                    attributes: { failureReason: "insufficient_credits" }
                });

                return { success: false, outputs: {}, error: errorMessage };
            }

            // Reserve credits
            const reserved = await reserveCredits({
                workspaceId,
                estimatedCredits
            });

            if (!reserved) {
                const errorMessage = "Failed to reserve credits for execution";
                logger.error("Credit reservation failed");

                await emitExecutionFailed({ executionId, error: errorMessage });
                await endSpan({
                    spanId: workflowRunSpanId,
                    error: new Error(errorMessage),
                    attributes: { failureReason: "credit_reservation_failed" }
                });

                return { success: false, outputs: {}, error: errorMessage };
            }

            reservedCredits = estimatedCredits;
            logger.info("Credits reserved", { reservedCredits });
        }

        // =========================================================================
        // PHASE 1: BUILD WORKFLOW
        // =========================================================================
        logger.info("Building workflow graph");
        const buildResult = buildWorkflow(workflowDefinition);

        if (!buildResult.success || !buildResult.workflow) {
            const errorMessage =
                buildResult.errors?.map((e) => e.message).join("; ") || "Workflow build failed";
            logger.error("Workflow build failed", new Error(errorMessage));

            await emitExecutionFailed({ executionId, error: errorMessage });
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: { failureReason: "workflow_build_failed" }
            });

            return { success: false, outputs: {}, error: errorMessage };
        }

        const builtWorkflow = buildResult.workflow;
        const summary = getWorkflowSummary(builtWorkflow);
        logger.info("Workflow built", summary);

        // Log warnings if any
        if (buildResult.warnings && buildResult.warnings.length > 0) {
            for (const warning of buildResult.warnings) {
                logger.info("Build warning", { code: warning.code, message: warning.message });
            }
        }

        // =========================================================================
        // PHASE 2: VALIDATE INPUTS
        // =========================================================================
        const inputValidation = await validateInputsActivity({
            workflowDefinition,
            inputs
        });

        if (!inputValidation.success) {
            const errorMessage = inputValidation.error?.message || "Input validation failed";
            logger.error("Input validation failed", new Error(errorMessage));

            await emitExecutionFailed({ executionId, error: errorMessage });
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: { failureReason: "input_validation_failed" }
            });

            return { success: false, outputs: {}, error: errorMessage };
        }

        // =========================================================================
        // PHASE 3: INITIALIZE EXECUTION
        // =========================================================================
        await emitExecutionStarted({
            executionId,
            workflowName: workflowDefinition.name || "Unnamed Workflow",
            totalNodes: builtWorkflow.nodes.size
        });

        let queueState = initializeQueue(builtWorkflow);
        let contextSnapshot = createContext(inputs);

        if (userId) {
            contextSnapshot = setVariable(contextSnapshot, "userId", userId);
        }

        const errors: Record<string, string> = {};

        // =========================================================================
        // PHASE 4: PARALLEL EXECUTION LOOP
        // =========================================================================
        logger.info("Starting parallel execution", {
            readyNodes: queueState.ready.size,
            maxConcurrent: builtWorkflow.maxConcurrentNodes
        });

        while (!isExecutionComplete(queueState)) {
            // Get nodes ready for execution
            const readyNodeIds = getReadyNodes(queueState, builtWorkflow.maxConcurrentNodes);

            if (readyNodeIds.length === 0) {
                // Check for deadlock
                if (queueState.executing.size === 0) {
                    const deadlockError = "Execution deadlock: no nodes ready and none executing";
                    logger.error(deadlockError, new Error(deadlockError));
                    throw new Error(deadlockError);
                }
                // Wait for executing nodes to complete (shouldn't happen with Promise.all)
                break;
            }

            // Mark nodes as executing
            queueState = markExecuting(queueState, readyNodeIds);

            // Execute all ready nodes in parallel
            const nodePromises = readyNodeIds.map(async (nodeId) => {
                const node = builtWorkflow.nodes.get(nodeId)!;
                return executeNodeWithContext(nodeId, node, builtWorkflow, contextSnapshot, {
                    executionId,
                    workflowRunSpanId,
                    userId,
                    logger
                });
            });

            // Wait for all parallel nodes to complete
            const results = await Promise.all(nodePromises);

            // Process results
            for (const result of results) {
                if (result.success) {
                    // Store output in context
                    contextSnapshot = storeNodeOutput(
                        contextSnapshot,
                        result.nodeId,
                        result.output
                    );

                    // Handle pause signal from human review node
                    if (result.pause && result.pauseContext) {
                        const node = builtWorkflow.nodes.get(result.nodeId);

                        // Emit execution paused event
                        await emitExecutionPaused({
                            executionId,
                            reason: result.pauseContext.reason || "Waiting for user response",
                            pausedAtNodeId: result.nodeId,
                            pausedAtNodeName: node?.name || result.nodeId,
                            pauseContext: {
                                prompt: result.pauseContext.prompt,
                                description: result.pauseContext.description,
                                variableName: result.pauseContext.variableName || "userResponse",
                                inputType: result.pauseContext.inputType || "text",
                                placeholder: result.pauseContext.placeholder,
                                validation: result.pauseContext.validation,
                                required: result.pauseContext.required
                            }
                        });

                        // End workflow span with paused status
                        await endSpan({
                            spanId: workflowRunSpanId,
                            output: { paused: true, pausedAtNodeId: result.nodeId },
                            attributes: {
                                status: "paused",
                                pausedAtNodeId: result.nodeId
                            }
                        });

                        logger.info("Workflow paused for human review", {
                            nodeId: result.nodeId,
                            variableName: result.pauseContext.variableName
                        });

                        // Return paused state - Temporal workflow will wait for signal to resume
                        return {
                            success: true,
                            outputs: { _paused: true, _pausedAtNodeId: result.nodeId },
                            error: undefined
                        };
                    }

                    // Handle special node types
                    if (result.branchesToSkip && result.branchesToSkip.length > 0) {
                        // Conditional node - skip inactive branches
                        for (const branchNodeId of result.branchesToSkip) {
                            queueState = markSkipped(queueState, branchNodeId, builtWorkflow);
                        }
                    }

                    // Track credit usage for this node
                    if (!skipCreditCheck && workspaceId) {
                        let nodeCredit = 0;

                        // Calculate credits based on token usage (for LLM nodes) or flat rate
                        if (result.metrics?.tokenUsage) {
                            nodeCredit = await calculateLLMCredits({
                                model: result.metrics.tokenUsage.model || "default",
                                inputTokens: result.metrics.tokenUsage.promptTokens || 0,
                                outputTokens: result.metrics.tokenUsage.completionTokens || 0
                            });
                        } else {
                            nodeCredit = await calculateNodeCredits({ nodeType: result.nodeType });
                        }

                        nodeCredits.set(result.nodeId, nodeCredit);
                        accumulatedCredits += nodeCredit;
                    }

                    queueState = markCompleted(
                        queueState,
                        result.nodeId,
                        result.output,
                        builtWorkflow
                    );
                } else {
                    errors[result.nodeId] = result.error;
                    queueState = markFailed(queueState, result.nodeId, result.error, builtWorkflow);
                }
            }

            // Emit progress
            const progress = getExecutionProgress(queueState);
            const execSummary = getExecutionSummary(queueState);
            await emitExecutionProgress({
                executionId,
                completed: execSummary.completed,
                total: execSummary.total,
                percentage: progress
            });
        }

        // =========================================================================
        // PHASE 5: FINALIZE EXECUTION
        // =========================================================================
        const finalSummary = getExecutionSummary(queueState);

        if (finalSummary.failed > 0) {
            const errorMessage = `Workflow completed with ${finalSummary.failed} failed nodes: ${JSON.stringify(errors)}`;
            const failedNodeId = Object.keys(errors)[0];

            await emitExecutionFailed({ executionId, error: errorMessage, failedNodeId });
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: {
                    failureReason: "node_execution_errors",
                    failedNodeCount: finalSummary.failed,
                    completedNodeCount: finalSummary.completed
                }
            });

            return {
                success: false,
                outputs: buildFinalOutputs(contextSnapshot, builtWorkflow.outputNodeIds),
                error: errorMessage
            };
        }

        // Validate outputs
        const finalOutputs = buildFinalOutputs(contextSnapshot, builtWorkflow.outputNodeIds);
        const outputValidation = await validateOutputsActivity({
            workflowDefinition,
            outputs: finalOutputs
        });

        if (!outputValidation.success) {
            const errorMessage = outputValidation.error?.message || "Output validation failed";
            logger.error("Output validation failed", new Error(errorMessage));

            await emitExecutionFailed({ executionId, error: errorMessage });
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: { failureReason: "output_validation_failed" }
            });

            return { success: false, outputs: finalOutputs, error: errorMessage };
        }

        const workflowDuration = Date.now() - workflowStartTime;

        await emitExecutionCompleted({
            executionId,
            outputs: finalOutputs,
            duration: workflowDuration
        });

        await endSpan({
            spanId: workflowRunSpanId,
            output: { success: true, outputs: finalOutputs },
            attributes: {
                durationMs: workflowDuration,
                completedNodeCount: finalSummary.completed,
                totalNodeCount: finalSummary.total
            }
        });

        logger.info("Workflow completed successfully", {
            duration: workflowDuration,
            nodesCompleted: finalSummary.completed
        });

        // Finalize credits on successful completion
        if (!skipCreditCheck && workspaceId && reservedCredits > 0) {
            await finalizeCredits({
                workspaceId,
                userId: userId || null,
                reservedAmount: reservedCredits,
                actualAmount: accumulatedCredits,
                operationType: "workflow_execution",
                operationId: executionId,
                description: `Workflow: ${workflowDefinition.name || "Unnamed"}`,
                metadata: {
                    executionId,
                    executionType: "workflow",
                    workflowName: workflowDefinition.name,
                    nodeBreakdown: Array.from(nodeCredits.entries()).map(([id, credits]) => ({
                        nodeId: id,
                        credits
                    })),
                    durationMs: workflowDuration,
                    estimatedCredits: reservedCredits,
                    actualCredits: accumulatedCredits
                }
            });
            logger.info("Credits finalized", {
                reserved: reservedCredits,
                actual: accumulatedCredits,
                delta: reservedCredits - accumulatedCredits
            });
        }

        return { success: true, outputs: finalOutputs };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("Workflow failed", error instanceof Error ? error : new Error(errorMessage));

        await emitExecutionFailed({ executionId, error: errorMessage });
        await endSpan({
            spanId: workflowRunSpanId,
            error: error instanceof Error ? error : new Error(errorMessage),
            attributes: { failureReason: "workflow_exception" }
        });

        // Handle credits on failure
        if (!skipCreditCheck && workspaceId && reservedCredits > 0) {
            if (accumulatedCredits > 0) {
                // Some work was done - finalize with partial usage
                await finalizeCredits({
                    workspaceId,
                    userId: userId || null,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "workflow_execution",
                    operationId: executionId,
                    description: `Workflow (failed): ${workflowDefinition.name || "Unnamed"}`
                });
                logger.info("Credits finalized for partial execution", {
                    actual: accumulatedCredits
                });
            } else {
                // No work done - release full reservation
                await releaseCredits({ workspaceId, amount: reservedCredits });
                logger.info("Credits released due to failure", { released: reservedCredits });
            }
        }

        return { success: false, outputs: {}, error: errorMessage };
    }
}

// ============================================================================
// NODE EXECUTION HELPER
// ============================================================================

interface NodeExecutionResult {
    nodeId: string;
    nodeType: string;
    success: boolean;
    output: JsonObject;
    error: string;
    branchesToSkip?: string[];
    pause?: boolean;
    pauseContext?: {
        reason: string;
        nodeId: string;
        pausedAt: number;
        resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
        timeoutMs?: number;
        preservedData?: JsonObject;
        // Human review specific fields
        prompt?: string;
        description?: string;
        variableName?: string;
        inputType?: "text" | "number" | "boolean" | "json";
        placeholder?: string;
        validation?: JsonObject;
        required?: boolean;
    };
    // Metrics for credit calculation
    metrics?: {
        durationMs?: number;
        tokenUsage?: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
            model?: string;
            provider?: string;
        };
    };
}

interface ExecutionMeta {
    executionId: string;
    workflowRunSpanId: string;
    userId?: string;
    logger: ReturnType<typeof createWorkflowLogger>;
}

/**
 * Execute a single node with context and span tracking.
 */
async function executeNodeWithContext(
    nodeId: string,
    node: ExecutableNode,
    workflow: BuiltWorkflow,
    context: ContextSnapshot,
    meta: ExecutionMeta
): Promise<NodeExecutionResult> {
    const { executionId, workflowRunSpanId, userId, logger } = meta;

    // Create NODE_EXECUTION span
    const nodeContext = await createSpan({
        traceId: executionId,
        parentSpanId: workflowRunSpanId,
        name: `Node: ${node.name || nodeId}`,
        spanType: SpanType.NODE_EXECUTION,
        entityId: nodeId,
        input: { nodeId, nodeType: node.type, nodeConfig: node.config },
        attributes: { userId, nodeId, nodeType: node.type, nodeName: node.name }
    });
    const nodeSpanId = nodeContext.spanId;

    await emitNodeStarted({
        executionId,
        nodeId,
        nodeName: node.name,
        nodeType: node.type
    });

    const nodeStartTime = Date.now();

    try {
        let output: JsonObject = {};
        let branchesToSkip: string[] | undefined;
        let nodeMetrics: NodeExecutionResult["metrics"] | undefined;

        // Get merged context for node execution
        const execContext = getExecutionContext(context);

        // Handle special node types
        switch (node.type) {
            case "input": {
                // Input nodes pass through inputs
                const inputName =
                    typeof node.config.inputName === "string" ? node.config.inputName : null;
                if (inputName) {
                    output = { [inputName]: context.inputs[inputName] };
                } else {
                    output = { ...context.inputs };
                }
                break;
            }

            case "conditional": {
                // Evaluate condition inline
                output = evaluateConditionalNode(node, execContext);
                const branch = output.branch as string;

                // Find edges from this conditional node and determine which to skip
                const edges = getEdgesFromNode(workflow.edges, nodeId);
                branchesToSkip = [];
                for (const edge of edges) {
                    if (
                        edge.handleType !== branch &&
                        (edge.handleType === "true" || edge.handleType === "false")
                    ) {
                        branchesToSkip.push(edge.target);
                    }
                }
                break;
            }

            case "loop-start": {
                // Loop start sentinel - evaluate loop condition
                output = evaluateLoopStart(node, execContext);
                break;
            }

            case "loop-end": {
                // Loop end sentinel - just pass through
                output = { loopComplete: true };
                break;
            }

            default: {
                // Standard node execution via activity
                const executionResult = await executeNode({
                    nodeType: node.type,
                    nodeConfig: node.config,
                    context: execContext,
                    executionContext: {
                        executionId,
                        workflowName: workflow.originalDefinition.name,
                        userId,
                        nodeId
                    }
                });

                // Handle new return format with signals
                output = executionResult.result;
                nodeMetrics = executionResult.metrics;

                // Check for pause signal (human review node)
                if (executionResult.signals?.pause) {
                    const nodeDuration = Date.now() - nodeStartTime;

                    await emitNodeCompleted({
                        executionId,
                        nodeId,
                        nodeName: node.name || nodeId,
                        nodeType: node.type,
                        output,
                        duration: nodeDuration,
                        metadata: { paused: true }
                    });

                    await endSpan({
                        spanId: nodeSpanId,
                        output: { nodeType: node.type, success: true, paused: true },
                        attributes: { durationMs: nodeDuration }
                    });

                    return {
                        nodeId,
                        nodeType: node.type,
                        success: true,
                        output,
                        error: "",
                        pause: true,
                        pauseContext: executionResult.signals.pauseContext,
                        metrics: executionResult.metrics
                    };
                }

                // Handle branch skip signals from router nodes
                if (executionResult.signals?.branchesToSkip) {
                    branchesToSkip = executionResult.signals.branchesToSkip;
                }
            }
        }

        const nodeDuration = Date.now() - nodeStartTime;

        await emitNodeCompleted({
            executionId,
            nodeId,
            nodeName: node.name || nodeId,
            nodeType: node.type,
            output,
            duration: nodeDuration
        });

        await endSpan({
            spanId: nodeSpanId,
            output: { nodeType: node.type, success: true },
            attributes: { durationMs: nodeDuration }
        });

        return {
            nodeId,
            nodeType: node.type,
            success: true,
            output,
            error: "",
            branchesToSkip,
            metrics: nodeMetrics
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("Node failed", error instanceof Error ? error : new Error(errorMessage), {
            nodeId
        });

        await endSpan({
            spanId: nodeSpanId,
            error: error instanceof Error ? error : new Error(errorMessage),
            attributes: { success: false, failureReason: "node_execution_failed" }
        });

        await emitNodeFailed({
            executionId,
            nodeId,
            nodeName: node.name || nodeId,
            nodeType: node.type,
            error: errorMessage
        });

        return { nodeId, nodeType: node.type, success: false, output: {}, error: errorMessage };
    }
}

// ============================================================================
// SPECIAL NODE TYPE HANDLERS
// ============================================================================

/**
 * Parse a string value into its appropriate type (number, boolean, null, or keep as string)
 */
function parseValue(value: string): JsonValue {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
        return num;
    }

    // Parse booleans
    const lower = value.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null" || lower === "undefined") return null;

    // Try to parse as JSON (for objects/arrays)
    if (
        (value.trim().startsWith("{") && value.trim().endsWith("}")) ||
        (value.trim().startsWith("[") && value.trim().endsWith("]"))
    ) {
        try {
            return JSON.parse(value);
        } catch {
            // Not valid JSON, return as string
        }
    }

    return value;
}

/**
 * Compare two values for equality with type coercion
 */
function condEquals(left: JsonValue, right: JsonValue): boolean {
    if (left === null) return right === null;
    if (typeof left === "number" || typeof right === "number") {
        return Number(left) === Number(right);
    }
    if (typeof left === "string" || typeof right === "string") {
        return String(left).toLowerCase() === String(right).toLowerCase();
    }
    if (typeof left === "boolean" || typeof right === "boolean") {
        return Boolean(left) === Boolean(right);
    }
    return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Compare two values numerically or lexicographically
 */
function condCompare(left: JsonValue, right: JsonValue): number {
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (isNaN(leftNum) || isNaN(rightNum)) {
        return String(left).localeCompare(String(right));
    }
    return leftNum - rightNum;
}

/**
 * Check if value contains searchValue (for strings and arrays)
 */
function condContains(value: JsonValue, searchValue: JsonValue): boolean {
    if (typeof value === "string") {
        return value.toLowerCase().includes(String(searchValue).toLowerCase());
    }
    if (Array.isArray(value)) {
        return value.some((item) => condEquals(item, searchValue));
    }
    return false;
}

/**
 * Evaluate a condition based on operator
 */
function evaluateCondition(left: JsonValue, operator: string, right: JsonValue): boolean {
    switch (operator) {
        case "==":
            return condEquals(left, right);
        case "!=":
            return !condEquals(left, right);
        case ">":
            return condCompare(left, right) > 0;
        case "<":
            return condCompare(left, right) < 0;
        case ">=":
            return condCompare(left, right) >= 0;
        case "<=":
            return condCompare(left, right) <= 0;
        case "contains":
            return condContains(left, right);
        case "startsWith": {
            const str = String(left);
            const search = String(right);
            return str.toLowerCase().startsWith(search.toLowerCase());
        }
        case "endsWith": {
            const str = String(left);
            const search = String(right);
            return str.toLowerCase().endsWith(search.toLowerCase());
        }
        default:
            // Default to equality for unknown operators
            return condEquals(left, right);
    }
}

/**
 * Evaluate a conditional node inline.
 */
function evaluateConditionalNode(node: ExecutableNode, context: JsonObject): JsonObject {
    const leftValue = typeof node.config.leftValue === "string" ? node.config.leftValue : "";
    const rightValue = typeof node.config.rightValue === "string" ? node.config.rightValue : "";
    const operator = typeof node.config.operator === "string" ? node.config.operator : "==";

    // Variable interpolation
    const interpolate = (str: string): string => {
        return str.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const value = context[key.trim()];
            return value !== undefined ? String(value) : "";
        });
    };

    const leftInterpolated = interpolate(leftValue);
    const rightInterpolated = interpolate(rightValue);

    // Parse values for type-aware comparison
    const leftParsed = parseValue(leftInterpolated);
    const rightParsed = parseValue(rightInterpolated);

    // Evaluate condition using proper operator logic
    const conditionMet = evaluateCondition(leftParsed, operator, rightParsed);
    const branch = conditionMet ? "true" : "false";

    return {
        conditionMet,
        branch,
        leftValue: leftInterpolated,
        rightValue: rightInterpolated,
        operator
    };
}

/**
 * Evaluate loop start conditions.
 */
function evaluateLoopStart(node: ExecutableNode, context: JsonObject): JsonObject {
    const loopType = (node.config.loopType as string) || "forEach";
    const arrayPath = node.config.arrayPath as string | undefined;
    const count = node.config.count as number | undefined;
    const iterationVar = (node.config.iterationVariable as string) || "index";
    const currentIteration = (context[iterationVar] as number) || 0;

    let shouldContinue = false;
    let total = 0;
    let item: JsonValue = null;

    switch (loopType) {
        case "forEach": {
            // Get array from context
            const arrayValue = arrayPath ? context[arrayPath.replace(/^\{\{|\}\}$/g, "")] : [];
            const array = Array.isArray(arrayValue) ? arrayValue : [];
            total = array.length;
            shouldContinue = currentIteration < total;
            item = shouldContinue ? (array[currentIteration] as JsonValue) : null;
            break;
        }
        case "count": {
            total = count || 0;
            shouldContinue = currentIteration < total;
            break;
        }
        case "while": {
            // Evaluate condition (simplified - would need full expression evaluator)
            shouldContinue = currentIteration < ((node.config.maxIterations as number) || 1000);
            break;
        }
    }

    return {
        continue: shouldContinue,
        iteration: currentIteration,
        item,
        total
    };
}

/**
 * Get all edges from a specific node.
 */
function getEdgesFromNode(edges: Map<string, TypedEdge>, nodeId: string): TypedEdge[] {
    const result: TypedEdge[] = [];
    for (const edge of edges.values()) {
        if (edge.source === nodeId) {
            result.push(edge);
        }
    }
    return result;
}
