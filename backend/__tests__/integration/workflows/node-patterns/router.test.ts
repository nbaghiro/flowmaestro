/**
 * Smart Routing Pattern Integration Tests
 *
 * True integration tests that execute router workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - LLM-based classification routing
 * - Multi-route branching workflows
 * - Router with default fallback
 * - Router based on confidence scores
 * - Sequential routers (multi-level routing)
 * - Router combined with other node types
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create a basic router workflow with multiple processing branches
 * Input -> Router -> [Process_Sales | Process_Support | Process_Billing] -> Output
 */
function createBasicRouterDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "message" },
        position: { x: 0, y: 100 }
    };

    nodes["router"] = {
        type: "router",
        name: "Classify Message",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Classify this customer message: {{input.message}}",
            routes: [
                {
                    value: "sales",
                    label: "Sales Inquiry",
                    description: "Questions about products or pricing"
                },
                {
                    value: "support",
                    label: "Technical Support",
                    description: "Technical issues or bugs"
                },
                { value: "billing", label: "Billing", description: "Payment or invoice questions" }
            ],
            defaultRoute: "support",
            outputVariable: "category"
        },
        position: { x: 200, y: 100 }
    };

    nodes["process_sales"] = {
        type: "code",
        name: "Handle Sales",
        config: {
            language: "javascript",
            code: "return { response: 'Sales team will contact you soon!', department: 'sales', priority: 'high' };"
        },
        position: { x: 400, y: 0 }
    };

    nodes["process_support"] = {
        type: "code",
        name: "Handle Support",
        config: {
            language: "javascript",
            code: "return { response: 'Creating support ticket...', department: 'support', priority: 'medium' };"
        },
        position: { x: 400, y: 100 }
    };

    nodes["process_billing"] = {
        type: "code",
        name: "Handle Billing",
        config: {
            language: "javascript",
            code: "return { response: 'Billing department notified.', department: 'billing', priority: 'low' };"
        },
        position: { x: 400, y: 200 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 100 }
    };

    edges.push(
        {
            id: "input-router",
            source: "input",
            target: "router",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "router-sales",
            source: "router",
            target: "process_sales",
            sourceHandle: "sales",
            targetHandle: "input"
        },
        {
            id: "router-support",
            source: "router",
            target: "process_support",
            sourceHandle: "support",
            targetHandle: "input"
        },
        {
            id: "router-billing",
            source: "router",
            target: "process_billing",
            sourceHandle: "billing",
            targetHandle: "input"
        },
        {
            id: "sales-output",
            source: "process_sales",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "support-output",
            source: "process_support",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "billing-output",
            source: "process_billing",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Basic Router Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a router with LLM processing on each branch
 * Input -> Router -> [LLM_Sales | LLM_Support] -> Output
 */
function createRouterWithLLMBranchesDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "query" },
        position: { x: 0, y: 50 }
    };

    nodes["router"] = {
        type: "router",
        name: "Route Query",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Determine if this is a technical or business question: {{input.query}}",
            routes: [
                { value: "technical", label: "Technical Question" },
                { value: "business", label: "Business Question" }
            ],
            defaultRoute: "technical",
            outputVariable: "queryType"
        },
        position: { x: 200, y: 50 }
    };

    nodes["llm_technical"] = {
        type: "llm",
        name: "Technical Expert",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "You are a technical expert. Answer technical questions with detailed explanations.",
            prompt: "{{input.query}}"
        },
        position: { x: 400, y: 0 }
    };

    nodes["llm_business"] = {
        type: "llm",
        name: "Business Expert",
        config: {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            systemPrompt: "You are a business consultant. Provide strategic business advice.",
            prompt: "{{input.query}}"
        },
        position: { x: 400, y: 100 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "answer" },
        position: { x: 600, y: 50 }
    };

    edges.push(
        {
            id: "input-router",
            source: "input",
            target: "router",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "router-technical",
            source: "router",
            target: "llm_technical",
            sourceHandle: "technical",
            targetHandle: "input"
        },
        {
            id: "router-business",
            source: "router",
            target: "llm_business",
            sourceHandle: "business",
            targetHandle: "input"
        },
        {
            id: "technical-output",
            source: "llm_technical",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "business-output",
            source: "llm_business",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Router with LLM Branches",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a two-level router (router -> router)
 * Input -> Router1 (category) -> Router2 (subcategory) -> Processing -> Output
 */
function createMultiLevelRouterDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "ticket" },
        position: { x: 0, y: 100 }
    };

    nodes["router_category"] = {
        type: "router",
        name: "Classify Category",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Classify this support ticket into a main category: {{input.ticket}}",
            routes: [
                { value: "hardware", label: "Hardware Issue" },
                { value: "software", label: "Software Issue" }
            ],
            defaultRoute: "software",
            outputVariable: "mainCategory"
        },
        position: { x: 200, y: 100 }
    };

    nodes["router_hardware"] = {
        type: "router",
        name: "Hardware Subcategory",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "What type of hardware issue is this: {{input.ticket}}",
            routes: [
                { value: "laptop", label: "Laptop" },
                { value: "desktop", label: "Desktop" },
                { value: "peripheral", label: "Peripheral" }
            ],
            defaultRoute: "laptop",
            outputVariable: "hardwareType"
        },
        position: { x: 400, y: 0 }
    };

    nodes["router_software"] = {
        type: "router",
        name: "Software Subcategory",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "What type of software issue is this: {{input.ticket}}",
            routes: [
                { value: "os", label: "Operating System" },
                { value: "application", label: "Application" },
                { value: "network", label: "Network" }
            ],
            defaultRoute: "application",
            outputVariable: "softwareType"
        },
        position: { x: 400, y: 200 }
    };

    nodes["process_result"] = {
        type: "code",
        name: "Generate Result",
        config: {
            language: "javascript",
            code: `
                const category = inputs.router_category?.mainCategory || 'unknown';
                const subCategory = inputs.router_hardware?.hardwareType || inputs.router_software?.softwareType || 'unknown';
                return { category, subCategory, ticketId: 'TKT-' + Date.now() };
            `
        },
        position: { x: 600, y: 100 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "classification" },
        position: { x: 800, y: 100 }
    };

    edges.push(
        {
            id: "input-router1",
            source: "input",
            target: "router_category",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "router1-hardware",
            source: "router_category",
            target: "router_hardware",
            sourceHandle: "hardware",
            targetHandle: "input"
        },
        {
            id: "router1-software",
            source: "router_category",
            target: "router_software",
            sourceHandle: "software",
            targetHandle: "input"
        },
        {
            id: "hardware-process",
            source: "router_hardware",
            target: "process_result",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "software-process",
            source: "router_software",
            target: "process_result",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "process-output",
            source: "process_result",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Multi-Level Router Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a router with pre-processing and post-processing
 * Input -> Transform (prepare) -> Router -> [Branch A | Branch B] -> Transform (finalize) -> Output
 */
function createRouterWithTransformsDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 50 }
    };

    nodes["preprocess"] = {
        type: "transform",
        name: "Prepare Data",
        config: {
            operation: "extract",
            inputData: "${input.data}",
            expression: "content",
            outputVariable: "preparedContent"
        },
        position: { x: 200, y: 50 }
    };

    nodes["router"] = {
        type: "router",
        name: "Route by Sentiment",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Analyze sentiment of: {{preprocess.preparedContent}}",
            routes: [
                { value: "positive", label: "Positive Sentiment" },
                { value: "negative", label: "Negative Sentiment" },
                { value: "neutral", label: "Neutral Sentiment" }
            ],
            defaultRoute: "neutral",
            outputVariable: "sentiment"
        },
        position: { x: 400, y: 50 }
    };

    nodes["handle_positive"] = {
        type: "code",
        name: "Handle Positive",
        config: {
            language: "javascript",
            code: "return { action: 'thank_you', score: 1, message: inputs.preprocess.preparedContent };"
        },
        position: { x: 600, y: 0 }
    };

    nodes["handle_negative"] = {
        type: "code",
        name: "Handle Negative",
        config: {
            language: "javascript",
            code: "return { action: 'escalate', score: -1, message: inputs.preprocess.preparedContent };"
        },
        position: { x: 600, y: 50 }
    };

    nodes["handle_neutral"] = {
        type: "code",
        name: "Handle Neutral",
        config: {
            language: "javascript",
            code: "return { action: 'acknowledge', score: 0, message: inputs.preprocess.preparedContent };"
        },
        position: { x: 600, y: 100 }
    };

    nodes["postprocess"] = {
        type: "transform",
        name: "Finalize Result",
        config: {
            operation: "merge",
            inputData: "${router}",
            expression: "${handle_positive} ${handle_negative} ${handle_neutral}",
            outputVariable: "finalResult"
        },
        position: { x: 800, y: 50 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 50 }
    };

    edges.push(
        {
            id: "input-preprocess",
            source: "input",
            target: "preprocess",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "preprocess-router",
            source: "preprocess",
            target: "router",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "router-positive",
            source: "router",
            target: "handle_positive",
            sourceHandle: "positive",
            targetHandle: "input"
        },
        {
            id: "router-negative",
            source: "router",
            target: "handle_negative",
            sourceHandle: "negative",
            targetHandle: "input"
        },
        {
            id: "router-neutral",
            source: "router",
            target: "handle_neutral",
            sourceHandle: "neutral",
            targetHandle: "input"
        },
        {
            id: "positive-postprocess",
            source: "handle_positive",
            target: "postprocess",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "negative-postprocess",
            source: "handle_negative",
            target: "postprocess",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "neutral-postprocess",
            source: "handle_neutral",
            target: "postprocess",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "postprocess-output",
            source: "postprocess",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Router with Transforms Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a router for content moderation
 * Input -> Router -> [Safe | Flagged | Blocked] -> Action -> Output
 */
function createModerationRouterDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "content" },
        position: { x: 0, y: 100 }
    };

    nodes["router"] = {
        type: "router",
        name: "Moderate Content",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Evaluate the safety of this content: {{input.content}}",
            routes: [
                { value: "safe", label: "Safe Content", description: "Content is appropriate" },
                {
                    value: "flagged",
                    label: "Flagged for Review",
                    description: "Needs human review"
                },
                { value: "blocked", label: "Blocked", description: "Violates guidelines" }
            ],
            defaultRoute: "flagged",
            temperature: 0,
            outputVariable: "moderationResult"
        },
        position: { x: 200, y: 100 }
    };

    nodes["approve"] = {
        type: "code",
        name: "Approve Content",
        config: {
            language: "javascript",
            code: "return { status: 'approved', action: 'publish', content: inputs.input.content };"
        },
        position: { x: 400, y: 0 }
    };

    nodes["review"] = {
        type: "code",
        name: "Flag for Review",
        config: {
            language: "javascript",
            code: "return { status: 'pending_review', action: 'queue_for_moderation', content: inputs.input.content };"
        },
        position: { x: 400, y: 100 }
    };

    nodes["block"] = {
        type: "code",
        name: "Block Content",
        config: {
            language: "javascript",
            code: "return { status: 'blocked', action: 'reject', reason: 'content_policy_violation' };"
        },
        position: { x: 400, y: 200 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "moderationDecision" },
        position: { x: 600, y: 100 }
    };

    edges.push(
        {
            id: "input-router",
            source: "input",
            target: "router",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "router-safe",
            source: "router",
            target: "approve",
            sourceHandle: "safe",
            targetHandle: "input"
        },
        {
            id: "router-flagged",
            source: "router",
            target: "review",
            sourceHandle: "flagged",
            targetHandle: "input"
        },
        {
            id: "router-blocked",
            source: "router",
            target: "block",
            sourceHandle: "blocked",
            targetHandle: "input"
        },
        {
            id: "approve-output",
            source: "approve",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "review-output",
            source: "review",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "block-output",
            source: "block",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Content Moderation Router",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        // For router nodes, include signals for branch selection
        const signals: JsonObject = {};
        if (params.nodeType === "router" && output._routerMetadata) {
            const metadata = output._routerMetadata as { selectedRoute?: string };
            if (metadata.selectedRoute) {
                signals.selectedRoute = metadata.selectedRoute;
            }
        }

        return {
            result: output,
            signals,
            metrics: {
                durationMs: 100,
                tokenUsage:
                    params.nodeType === "router" || params.nodeType === "llm"
                        ? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                        : undefined
            },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Smart Routing Pattern Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve(
                "../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("basic routing patterns", () => {
        it("should route to sales branch", async () => {
            const workflowDef = createBasicRouterDefinition();

            configureMockNodeOutputs({
                input: { message: "I want to know about your enterprise pricing" },
                router: {
                    category: "sales",
                    _routerMetadata: {
                        selectedRoute: "sales",
                        confidence: 0.95,
                        reasoning: "Message asks about pricing"
                    }
                },
                process_sales: {
                    response: "Sales team will contact you soon!",
                    department: "sales",
                    priority: "high"
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-sales-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-sales",
                            workflowDefinition: workflowDef,
                            inputs: { message: "I want to know about your enterprise pricing" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("process_sales");
        });

        it("should route to support branch", async () => {
            const workflowDef = createBasicRouterDefinition();

            configureMockNodeOutputs({
                input: { message: "My application keeps crashing" },
                router: {
                    category: "support",
                    _routerMetadata: {
                        selectedRoute: "support",
                        confidence: 0.9,
                        reasoning: "Technical issue reported"
                    }
                },
                process_support: {
                    response: "Creating support ticket...",
                    department: "support",
                    priority: "medium"
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-support-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-support",
                            workflowDefinition: workflowDef,
                            inputs: { message: "My application keeps crashing" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("process_support");
        });

        it("should route to billing branch", async () => {
            const workflowDef = createBasicRouterDefinition();

            configureMockNodeOutputs({
                input: { message: "Where can I find my invoice?" },
                router: {
                    category: "billing",
                    _routerMetadata: {
                        selectedRoute: "billing",
                        confidence: 0.88,
                        reasoning: "Invoice inquiry"
                    }
                },
                process_billing: {
                    response: "Billing department notified.",
                    department: "billing",
                    priority: "low"
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-billing-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-billing",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Where can I find my invoice?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("process_billing");
        });
    });

    describe("router with LLM branches", () => {
        it("should route technical question to technical expert", async () => {
            const workflowDef = createRouterWithLLMBranchesDefinition();

            configureMockNodeOutputs({
                input: { query: "How do I implement a binary search algorithm?" },
                router: {
                    queryType: "technical",
                    _routerMetadata: {
                        selectedRoute: "technical",
                        confidence: 0.95
                    }
                },
                llm_technical: {
                    content: "Binary search is a divide-and-conquer algorithm...",
                    provider: "openai"
                },
                output: { answer: "Binary search is..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-llm-tech-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-llm-tech",
                            workflowDefinition: workflowDef,
                            inputs: { query: "How do I implement a binary search algorithm?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("llm_technical");
        });

        it("should route business question to business expert", async () => {
            const workflowDef = createRouterWithLLMBranchesDefinition();

            configureMockNodeOutputs({
                input: { query: "What is the best strategy for entering new markets?" },
                router: {
                    queryType: "business",
                    _routerMetadata: {
                        selectedRoute: "business",
                        confidence: 0.92
                    }
                },
                llm_business: {
                    content: "Market entry strategies include...",
                    provider: "anthropic"
                },
                output: { answer: "Market entry strategies..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-llm-biz-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-llm-biz",
                            workflowDefinition: workflowDef,
                            inputs: {
                                query: "What is the best strategy for entering new markets?"
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("llm_business");
        });
    });

    describe("multi-level routing", () => {
        it("should route through hardware -> laptop subcategory", async () => {
            const workflowDef = createMultiLevelRouterDefinition();

            configureMockNodeOutputs({
                input: { ticket: "My laptop screen is flickering" },
                router_category: {
                    mainCategory: "hardware",
                    _routerMetadata: { selectedRoute: "hardware", confidence: 0.95 }
                },
                router_hardware: {
                    hardwareType: "laptop",
                    _routerMetadata: { selectedRoute: "laptop", confidence: 0.9 }
                },
                process_result: {
                    category: "hardware",
                    subCategory: "laptop",
                    ticketId: "TKT-123"
                },
                output: { classification: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multilevel-hardware-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multilevel-hardware",
                            workflowDefinition: workflowDef,
                            inputs: { ticket: "My laptop screen is flickering" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router_category");
            expect(nodeIds).toContain("router_hardware");
            expect(nodeIds).toContain("process_result");
        });

        it("should route through software -> network subcategory", async () => {
            const workflowDef = createMultiLevelRouterDefinition();

            configureMockNodeOutputs({
                input: { ticket: "Cannot connect to VPN" },
                router_category: {
                    mainCategory: "software",
                    _routerMetadata: { selectedRoute: "software", confidence: 0.85 }
                },
                router_software: {
                    softwareType: "network",
                    _routerMetadata: { selectedRoute: "network", confidence: 0.9 }
                },
                process_result: {
                    category: "software",
                    subCategory: "network",
                    ticketId: "TKT-456"
                },
                output: { classification: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multilevel-software-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multilevel-software",
                            workflowDefinition: workflowDef,
                            inputs: { ticket: "Cannot connect to VPN" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router_category");
            expect(nodeIds).toContain("router_software");
            expect(nodeIds).toContain("process_result");
        });
    });

    describe("router with transforms", () => {
        it("should preprocess, route, and postprocess", async () => {
            const workflowDef = createRouterWithTransformsDefinition();

            configureMockNodeOutputs({
                input: { data: { content: "This product is amazing!" } },
                preprocess: { preparedContent: "This product is amazing!" },
                router: {
                    sentiment: "positive",
                    _routerMetadata: { selectedRoute: "positive", confidence: 0.95 }
                },
                handle_positive: {
                    action: "thank_you",
                    score: 1,
                    message: "This product is amazing!"
                },
                postprocess: {
                    finalResult: { action: "thank_you", score: 1 }
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-transforms-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-transforms",
                            workflowDefinition: workflowDef,
                            inputs: { data: { content: "This product is amazing!" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("preprocess");
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("handle_positive");
            expect(nodeIds).toContain("postprocess");
        });
    });

    describe("content moderation routing", () => {
        it("should approve safe content", async () => {
            const workflowDef = createModerationRouterDefinition();

            configureMockNodeOutputs({
                input: { content: "This is a helpful tutorial about cooking" },
                router: {
                    moderationResult: "safe",
                    _routerMetadata: { selectedRoute: "safe", confidence: 0.99 }
                },
                approve: {
                    status: "approved",
                    action: "publish",
                    content: "This is a helpful tutorial about cooking"
                },
                output: { moderationDecision: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-moderation-safe-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-moderation-safe",
                            workflowDefinition: workflowDef,
                            inputs: { content: "This is a helpful tutorial about cooking" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("approve");
        });

        it("should flag ambiguous content for review", async () => {
            const workflowDef = createModerationRouterDefinition();

            configureMockNodeOutputs({
                input: { content: "Content with ambiguous language" },
                router: {
                    moderationResult: "flagged",
                    _routerMetadata: { selectedRoute: "flagged", confidence: 0.6 }
                },
                review: {
                    status: "pending_review",
                    action: "queue_for_moderation",
                    content: "Content with ambiguous language"
                },
                output: { moderationDecision: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-moderation-flagged-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-moderation-flagged",
                            workflowDefinition: workflowDef,
                            inputs: { content: "Content with ambiguous language" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("review");
        });

        it("should block policy-violating content", async () => {
            const workflowDef = createModerationRouterDefinition();

            configureMockNodeOutputs({
                input: { content: "Clearly violating content" },
                router: {
                    moderationResult: "blocked",
                    _routerMetadata: { selectedRoute: "blocked", confidence: 0.98 }
                },
                block: {
                    status: "blocked",
                    action: "reject",
                    reason: "content_policy_violation"
                },
                output: { moderationDecision: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-moderation-blocked-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-moderation-blocked",
                            workflowDefinition: workflowDef,
                            inputs: { content: "Clearly violating content" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("block");
        });
    });

    describe("error handling in routers", () => {
        it("should handle router classification failure", async () => {
            const workflowDef = createBasicRouterDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "router") {
                    throw new Error("LLM API rate limit exceeded");
                }

                return {
                    result: { message: "test" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { message: "test" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-router-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-router-failure",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test message" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should handle branch processing failure", async () => {
            const workflowDef = createBasicRouterDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "process_sales") {
                    throw new Error("Sales processing failed");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { message: "Pricing question" },
                    router: {
                        category: "sales",
                        _routerMetadata: { selectedRoute: "sales", confidence: 0.9 }
                    }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-branch-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-branch-failure",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Pricing question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world routing scenarios", () => {
        it("should handle customer inquiry classification", async () => {
            const workflowDef = createBasicRouterDefinition();

            // Test a single sales inquiry
            configureMockNodeOutputs({
                input: { message: "What are your subscription plans?" },
                router: {
                    category: "sales",
                    _routerMetadata: {
                        selectedRoute: "sales",
                        confidence: 0.9
                    }
                },
                process_sales: {
                    response: "Handled",
                    department: "sales"
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-inquiry-sales-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-inquiry-sales",
                            workflowDefinition: workflowDef,
                            inputs: { message: "What are your subscription plans?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("router");
            expect(nodeIds).toContain("process_sales");
        });

        it("should handle IT helpdesk ticket routing", async () => {
            const workflowDef = createMultiLevelRouterDefinition();

            configureMockNodeOutputs({
                input: { ticket: "My external monitor is not being detected" },
                router_category: {
                    mainCategory: "hardware",
                    _routerMetadata: { selectedRoute: "hardware", confidence: 0.88 }
                },
                router_hardware: {
                    hardwareType: "peripheral",
                    _routerMetadata: { selectedRoute: "peripheral", confidence: 0.85 }
                },
                process_result: {
                    category: "hardware",
                    subCategory: "peripheral",
                    ticketId: "TKT-789",
                    priority: "medium"
                },
                output: { classification: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-helpdesk-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-helpdesk",
                            workflowDefinition: workflowDef,
                            inputs: { ticket: "My external monitor is not being detected" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
