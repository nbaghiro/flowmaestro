/**
 * Pattern Test Utilities
 *
 * Utilities for testing workflow patterns from @flowmaestro/shared.
 * Provides helpers to execute patterns with mocked activities and validate results.
 *
 * Supports sandbox data infrastructure for realistic integration mocking.
 */

import type { JsonObject, WorkflowDefinition, WorkflowPattern } from "@flowmaestro/shared";
import { getWorkflowPatternById } from "@flowmaestro/shared";
import {
    sandboxDataService,
    fixtureRegistry,
    loadAllFixtures
} from "../../../../src/integrations/sandbox";
import { createContext, storeNodeOutput } from "../../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// Load fixtures at module init (async but cached)
loadAllFixtures().catch(() => {
    // Fixtures may fail to load in test environment - that's OK
});

// ============================================================================
// TYPES
// ============================================================================

export interface PatternTestConfig {
    /** Pattern ID from shared/src/workflow-patterns.ts */
    patternId: string;
    /** Mock outputs for each node (keyed by node ID) */
    mockOutputs: Record<string, JsonObject>;
    /** Initial inputs to the workflow */
    inputs: JsonObject;
    /** Optional: Signals for routers/conditionals (keyed by node ID) */
    mockSignals?: Record<string, JsonObject>;
}

export interface PatternTestResult {
    /** The pattern that was tested */
    pattern: WorkflowPattern;
    /** Final context after execution */
    context: ContextSnapshot;
    /** Order of nodes executed */
    executionOrder: string[];
    /** Final outputs from the workflow */
    finalOutputs: JsonObject;
    /** Whether the workflow succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
}

export interface NodeExecutionResult {
    nodeId: string;
    nodeType: string;
    output: JsonObject;
    signals?: JsonObject;
}

// ============================================================================
// PATTERN LOADING
// ============================================================================

/**
 * Load a workflow pattern by ID
 */
export function loadPattern(patternId: string): WorkflowPattern {
    const pattern = getWorkflowPatternById(patternId);
    if (!pattern) {
        throw new Error(`Pattern not found: ${patternId}`);
    }
    return pattern;
}

/**
 * Get node IDs from a workflow definition
 */
export function getNodeIds(definition: WorkflowDefinition): string[] {
    return Object.keys(definition.nodes);
}

/**
 * Get node type for a given node ID
 */
export function getNodeType(definition: WorkflowDefinition, nodeId: string): string {
    const node = definition.nodes[nodeId];
    if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
    }
    return node.type;
}

/**
 * Get outgoing edges from a node
 */
export function getOutgoingEdges(
    definition: WorkflowDefinition,
    nodeId: string
): Array<{ target: string; sourceHandle?: string }> {
    return definition.edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => ({
            target: edge.target,
            sourceHandle: edge.sourceHandle
        }));
}

/**
 * Get incoming edges to a node
 */
export function getIncomingEdges(
    definition: WorkflowDefinition,
    nodeId: string
): Array<{ source: string; targetHandle?: string }> {
    return definition.edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => ({
            source: edge.source,
            targetHandle: edge.targetHandle
        }));
}

// ============================================================================
// EXECUTION HELPERS
// ============================================================================

/**
 * Determine execution order based on topology (simple BFS from entry point)
 */
export function computeExecutionOrder(definition: WorkflowDefinition): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [definition.entryPoint];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (visited.has(nodeId)) {
            continue;
        }

        visited.add(nodeId);
        order.push(nodeId);

        // Add targets of outgoing edges
        const outgoing = getOutgoingEdges(definition, nodeId);
        for (const edge of outgoing) {
            if (!visited.has(edge.target)) {
                queue.push(edge.target);
            }
        }
    }

    return order;
}

/**
 * Compute execution order for a router pattern where only one branch executes
 */
export function computeRouterExecutionOrder(
    definition: WorkflowDefinition,
    routerNodeId: string,
    selectedRoute: string
): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [definition.entryPoint];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (visited.has(nodeId)) {
            continue;
        }

        visited.add(nodeId);
        order.push(nodeId);

        // Add targets of outgoing edges
        const outgoing = getOutgoingEdges(definition, nodeId);

        if (nodeId === routerNodeId) {
            // For router, only follow the selected route
            const selectedEdge = outgoing.find((e) => e.sourceHandle === selectedRoute);
            if (selectedEdge && !visited.has(selectedEdge.target)) {
                queue.push(selectedEdge.target);
            }
        } else {
            for (const edge of outgoing) {
                if (!visited.has(edge.target)) {
                    queue.push(edge.target);
                }
            }
        }
    }

    return order;
}

// ============================================================================
// MOCK EXECUTION
// ============================================================================

/**
 * Simulate executing a workflow pattern with mocked outputs
 *
 * This doesn't run actual Temporal workflows - it simulates the execution
 * flow to verify pattern structure and node connectivity.
 */
export async function simulatePatternExecution(
    config: PatternTestConfig
): Promise<PatternTestResult> {
    const pattern = loadPattern(config.patternId);
    const definition = pattern.definition;

    let context = createContext(config.inputs);
    const executionOrder: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
        // Compute expected execution order
        const expectedOrder = computeExecutionOrder(definition);

        for (const nodeId of expectedOrder) {
            const nodeType = getNodeType(definition, nodeId);

            // Check if we have mock output for this node
            const mockOutput = config.mockOutputs[nodeId];
            if (!mockOutput) {
                // For router nodes, check if we have a signal
                if (nodeType === "router" && config.mockSignals?.[nodeId]) {
                    const signal = config.mockSignals[nodeId];
                    context = storeNodeOutput(context, nodeId, signal);
                    executionOrder.push(nodeId);
                    continue;
                }

                // Input nodes get their value from inputs
                if (nodeType === "input") {
                    const node = definition.nodes[nodeId];
                    const inputVar = (node.config as Record<string, unknown>).inputVariable as
                        | string
                        | undefined;
                    const inputValue = inputVar ? config.inputs[inputVar] : config.inputs;
                    context = storeNodeOutput(context, nodeId, { value: inputValue });
                    executionOrder.push(nodeId);
                    continue;
                }

                // Output nodes aggregate from context
                if (nodeType === "output") {
                    context = storeNodeOutput(context, nodeId, { completed: true });
                    executionOrder.push(nodeId);
                    continue;
                }

                throw new Error(`No mock output provided for node: ${nodeId} (type: ${nodeType})`);
            }

            context = storeNodeOutput(context, nodeId, mockOutput);
            executionOrder.push(nodeId);
        }
    } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
    }

    // Extract final outputs
    const finalOutputs: JsonObject = {};
    for (const nodeId of executionOrder) {
        const output = context.nodeOutputs.get(nodeId);
        if (output) {
            finalOutputs[nodeId] = output as JsonObject;
        }
    }

    return {
        pattern,
        context,
        executionOrder,
        finalOutputs,
        success,
        error
    };
}

/**
 * Simulate pattern execution with router branch selection
 */
export async function simulateRouterPatternExecution(
    config: PatternTestConfig & {
        routerNodeId: string;
        selectedRoute: string;
    }
): Promise<PatternTestResult> {
    const pattern = loadPattern(config.patternId);
    const definition = pattern.definition;

    let context = createContext(config.inputs);
    const executionOrder: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
        // Compute expected execution order for this route
        const expectedOrder = computeRouterExecutionOrder(
            definition,
            config.routerNodeId,
            config.selectedRoute
        );

        for (const nodeId of expectedOrder) {
            const nodeType = getNodeType(definition, nodeId);

            // Check if we have mock output for this node
            const mockOutput = config.mockOutputs[nodeId];
            if (!mockOutput) {
                // Input nodes get their value from inputs
                if (nodeType === "input") {
                    const node = definition.nodes[nodeId];
                    const inputVar = (node.config as Record<string, unknown>).inputVariable as
                        | string
                        | undefined;
                    const inputValue = inputVar ? config.inputs[inputVar] : config.inputs;
                    context = storeNodeOutput(context, nodeId, { value: inputValue });
                    executionOrder.push(nodeId);
                    continue;
                }

                // Output nodes aggregate from context
                if (nodeType === "output") {
                    context = storeNodeOutput(context, nodeId, { completed: true });
                    executionOrder.push(nodeId);
                    continue;
                }

                throw new Error(`No mock output provided for node: ${nodeId} (type: ${nodeType})`);
            }

            context = storeNodeOutput(context, nodeId, mockOutput);
            executionOrder.push(nodeId);
        }
    } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
    }

    // Extract final outputs
    const finalOutputs: JsonObject = {};
    for (const nodeId of executionOrder) {
        const output = context.nodeOutputs.get(nodeId);
        if (output) {
            finalOutputs[nodeId] = output as JsonObject;
        }
    }

    return {
        pattern,
        context,
        executionOrder,
        finalOutputs,
        success,
        error
    };
}

// ============================================================================
// ASSERTIONS
// ============================================================================

/**
 * Assert that a pattern executed successfully
 */
export function assertPatternSuccess(result: PatternTestResult): void {
    if (!result.success) {
        throw new Error(`Pattern execution failed: ${result.error}`);
    }
}

/**
 * Assert that specific nodes were executed in order
 */
export function assertExecutionOrder(result: PatternTestResult, expectedOrder: string[]): void {
    expect(result.executionOrder).toEqual(expectedOrder);
}

/**
 * Assert that all expected nodes were executed (order doesn't matter)
 */
export function assertNodesExecuted(result: PatternTestResult, expectedNodes: string[]): void {
    for (const nodeId of expectedNodes) {
        expect(result.executionOrder).toContain(nodeId);
    }
}

/**
 * Assert that specific nodes were NOT executed
 */
export function assertNodesNotExecuted(result: PatternTestResult, excludedNodes: string[]): void {
    for (const nodeId of excludedNodes) {
        expect(result.executionOrder).not.toContain(nodeId);
    }
}

/**
 * Assert node output matches expected value
 */
export function assertNodeOutput(
    result: PatternTestResult,
    nodeId: string,
    expectedOutput: JsonObject
): void {
    const actualOutput = result.context.nodeOutputs.get(nodeId);
    expect(actualOutput).toMatchObject(expectedOutput);
}

// ============================================================================
// MOCK OUTPUT FACTORIES
// ============================================================================

/**
 * Create mock LLM output
 */
export function createMockLLMOutput(text: string, metadata?: JsonObject): JsonObject {
    return {
        text,
        tokens: { prompt: 100, completion: 50 },
        model: "gpt-4o",
        ...metadata
    };
}

/**
 * Create mock router output
 */
export function createMockRouterOutput(selectedRoute: string): JsonObject {
    return {
        selectedRoute,
        confidence: 0.95,
        reasoning: `Selected route: ${selectedRoute}`
    };
}

/**
 * Create mock HTTP output
 */
export function createMockHTTPOutput(data: JsonObject, status = 200): JsonObject {
    return {
        success: status >= 200 && status < 300,
        status,
        data,
        headers: {}
    };
}

/**
 * Create mock conditional output
 */
export function createMockConditionalOutput(
    result: boolean,
    actualValue?: JsonObject | string | number | boolean | null
): JsonObject {
    return {
        result,
        condition: "expression",
        actualValue: actualValue ?? result
    };
}

/**
 * Create mock integration action output
 */
export function createMockActionOutput(success: boolean, result?: JsonObject): JsonObject {
    return {
        success,
        result: result ?? {},
        executedAt: new Date().toISOString()
    };
}

/**
 * Create action output from sandbox fixtures
 * Uses real fixture data when available for more realistic testing
 */
export async function createSandboxActionOutput(
    provider: string,
    operation: string,
    params: JsonObject = {}
): Promise<JsonObject> {
    const sandboxResponse = await sandboxDataService.getSandboxResponse(
        provider,
        operation,
        params
    );

    if (sandboxResponse?.success && sandboxResponse.data) {
        return {
            success: true,
            result: sandboxResponse.data as JsonObject,
            executedAt: new Date().toISOString(),
            fromSandbox: true
        };
    }

    if (sandboxResponse && !sandboxResponse.success && sandboxResponse.error) {
        return {
            success: false,
            error: {
                type: sandboxResponse.error.type,
                message: sandboxResponse.error.message,
                retryable: sandboxResponse.error.retryable
            },
            executedAt: new Date().toISOString(),
            fromSandbox: true
        };
    }

    // Fallback to basic mock if no sandbox data available
    return createMockActionOutput(true);
}

/**
 * Get sandbox response for an action node
 * Helper for tests that need direct access to sandbox data
 */
export async function getSandboxResponseForAction(
    provider: string,
    operation: string,
    params: JsonObject = {}
): Promise<JsonObject | null> {
    const response = await sandboxDataService.getSandboxResponse(provider, operation, params);
    if (response?.success && response.data) {
        return response.data as JsonObject;
    }
    return null;
}

/**
 * Check if sandbox fixtures are available for a provider/operation
 */
export function hasSandboxFixture(provider: string, operation: string): boolean {
    return fixtureRegistry.has(provider, operation);
}

/**
 * Get sandbox data service for direct scenario registration
 */
export function getSandboxDataService(): typeof sandboxDataService {
    return sandboxDataService;
}

/**
 * Get fixture registry for direct fixture queries
 */
export function getFixtureRegistry(): typeof fixtureRegistry {
    return fixtureRegistry;
}

/**
 * Create mock trigger output
 */
export function createMockTriggerOutput(eventData: JsonObject): JsonObject {
    return {
        triggered: true,
        eventData,
        triggeredAt: new Date().toISOString()
    };
}

/**
 * Create mock transform output
 */
export function createMockTransformOutput(result: JsonObject): JsonObject {
    return {
        success: true,
        result,
        transformedAt: new Date().toISOString()
    };
}

// ============================================================================
// PATTERN HELPER FUNCTIONS
// ============================================================================

/**
 * Create knowledge base query output
 */
export function createKBQueryOutput(results: JsonObject[], metadata?: JsonObject): JsonObject {
    return {
        results,
        totalResults: results.length,
        query: "test query",
        ...metadata
    };
}

/**
 * Get pattern node IDs
 */
export function getPatternNodeIds(patternId: string): string[] {
    const pattern = loadPattern(patternId);
    return Object.keys(pattern.definition.nodes);
}

/**
 * Get pattern nodes by type
 */
export function getPatternNodesByType(
    patternId: string,
    nodeType: string
): Array<{ id: string; node: JsonObject }> {
    const pattern = loadPattern(patternId);
    const results: Array<{ id: string; node: JsonObject }> = [];

    for (const [id, node] of Object.entries(pattern.definition.nodes)) {
        if (node.type === nodeType) {
            results.push({ id, node: node as unknown as JsonObject });
        }
    }

    return results;
}

/**
 * Create human review output
 */
export function createHumanReviewOutput(approved: boolean, feedback?: string): JsonObject {
    return {
        approved,
        feedback: feedback ?? (approved ? "Approved" : "Rejected"),
        reviewedAt: new Date().toISOString(),
        reviewerId: "test-reviewer"
    };
}

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

/**
 * Validate that a pattern has required structure
 */
export function validatePatternStructure(patternId: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    try {
        const pattern = loadPattern(patternId);
        const definition = pattern.definition;

        // Check entry point exists
        if (!definition.nodes[definition.entryPoint]) {
            errors.push(`Entry point node not found: ${definition.entryPoint}`);
        }

        // Check all edges reference valid nodes
        for (const edge of definition.edges) {
            if (!definition.nodes[edge.source]) {
                errors.push(`Edge source node not found: ${edge.source}`);
            }
            if (!definition.nodes[edge.target]) {
                errors.push(`Edge target node not found: ${edge.target}`);
            }
        }

        // Check all nodes have required fields
        for (const [nodeId, node] of Object.entries(definition.nodes)) {
            if (!node.type) {
                errors.push(`Node missing type: ${nodeId}`);
            }
            if (!node.name) {
                errors.push(`Node missing name: ${nodeId}`);
            }
            if (!node.position) {
                errors.push(`Node missing position: ${nodeId}`);
            }
        }

        // Check node count matches
        const actualNodeCount = Object.keys(definition.nodes).length;
        if (actualNodeCount !== pattern.nodeCount) {
            errors.push(
                `Node count mismatch: expected ${pattern.nodeCount}, got ${actualNodeCount}`
            );
        }
    } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
