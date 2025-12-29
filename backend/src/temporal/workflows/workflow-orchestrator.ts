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
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: ACTIVITY_TIMEOUTS.EVENTS,
    retry: RETRY_POLICIES.NO_RETRY
});

export interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
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
    const { executionId, workflowDefinition, inputs = {}, userId } = input;

    // Create workflow logger
    const logger = createWorkflowLogger({
        executionId,
        workflowName: workflowDefinition.name || "Unnamed Workflow",
        userId
    });

    const workflowStartTime = Date.now();

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

                    // Handle special node types
                    if (result.branchesToSkip && result.branchesToSkip.length > 0) {
                        // Conditional node - skip inactive branches
                        for (const branchNodeId of result.branchesToSkip) {
                            queueState = markSkipped(queueState, branchNodeId, builtWorkflow);
                        }
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

        return { success: false, outputs: {}, error: errorMessage };
    }
}

// ============================================================================
// NODE EXECUTION HELPER
// ============================================================================

interface NodeExecutionResult {
    nodeId: string;
    success: boolean;
    output: JsonObject;
    error: string;
    branchesToSkip?: string[];
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
                output = await executeNode({
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

        return { nodeId, success: true, output, error: "", branchesToSkip };
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

        return { nodeId, success: false, output: {}, error: errorMessage };
    }
}

// ============================================================================
// SPECIAL NODE TYPE HANDLERS
// ============================================================================

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

    // Simple equality check (case-insensitive for strings)
    const conditionMet = leftInterpolated.toLowerCase() === rightInterpolated.toLowerCase();
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
