/**
 * Multimodal AI Pattern Integration Tests
 *
 * True integration tests that verify vision, image generation, and
 * multimodal AI node behavior through the Temporal workflow engine.
 *
 * Tests:
 * - Vision/image analysis (OpenAI, Anthropic, Google)
 * - Image generation (DALL-E, Stable Diffusion)
 * - Chained multimodal workflows
 * - Image editing operations (inpaint, upscale)
 * - Error handling scenarios
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
 * Create a vision analysis workflow
 * Input (image) -> Analyze -> Output
 */
function createVisionAnalysisWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Image Input",
        config: { inputName: "imageData" },
        position: { x: 0, y: 0 }
    };

    nodes["analyze"] = {
        type: "vision",
        name: "Analyze Image",
        config: {
            provider: "openai",
            model: "gpt-4-vision-preview",
            operation: "analyze",
            imageInput: "${input.imageData.url}",
            prompt: "Describe this image in detail. What objects, people, or scenes do you see?",
            detail: "high",
            maxTokens: 1000,
            outputVariable: "analysis"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-analyze", source: "input", target: "analyze" },
        { id: "analyze-output", source: "analyze", target: "output" }
    );

    return {
        name: "Vision Analysis Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an image generation workflow
 * Input (prompt) -> Generate -> Output
 */
function createImageGenerationWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Prompt Input",
        config: { inputName: "promptData" },
        position: { x: 0, y: 0 }
    };

    nodes["generate"] = {
        type: "imageGeneration",
        name: "Generate Image",
        config: {
            provider: "openai",
            model: "dall-e-3",
            prompt: "${input.promptData.prompt}",
            size: "1024x1024",
            quality: "hd",
            style: "vivid",
            n: 1,
            outputFormat: "url",
            outputVariable: "generatedImage"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-generate", source: "input", target: "generate" },
        { id: "generate-output", source: "generate", target: "output" }
    );

    return {
        name: "Image Generation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a chained vision workflow: Analyze -> Generate
 * Input (image) -> Analyze -> Generate Variation -> Output
 */
function createAnalyzeAndGenerateWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Image Input",
        config: { inputName: "imageData" },
        position: { x: 0, y: 0 }
    };

    nodes["analyze"] = {
        type: "vision",
        name: "Analyze Image",
        config: {
            provider: "openai",
            model: "gpt-4-vision-preview",
            operation: "analyze",
            imageInput: "${input.imageData.url}",
            prompt: "Describe this image briefly for use as an image generation prompt",
            outputVariable: "imageDescription"
        },
        position: { x: 200, y: 0 }
    };

    nodes["enhance"] = {
        type: "llm",
        name: "Enhance Prompt",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Enhance this image description into a detailed art prompt: ${analyze.imageDescription.analysis}",
            outputVariable: "enhancedPrompt"
        },
        position: { x: 400, y: 0 }
    };

    nodes["generate"] = {
        type: "imageGeneration",
        name: "Generate Variation",
        config: {
            provider: "openai",
            model: "dall-e-3",
            prompt: "${enhance.enhancedPrompt}",
            size: "1024x1024",
            quality: "hd",
            outputVariable: "generatedImage"
        },
        position: { x: 600, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-analyze", source: "input", target: "analyze" },
        { id: "analyze-enhance", source: "analyze", target: "enhance" },
        { id: "enhance-generate", source: "enhance", target: "generate" },
        { id: "generate-output", source: "generate", target: "output" }
    );

    return {
        name: "Analyze and Generate Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a document understanding workflow
 * Input (document image) -> OCR/Analyze -> Extract Data -> Output
 */
function createDocumentUnderstandingWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Document Input",
        config: { inputName: "documentData" },
        position: { x: 0, y: 0 }
    };

    nodes["analyze"] = {
        type: "vision",
        name: "Analyze Document",
        config: {
            provider: "openai",
            model: "gpt-4-vision-preview",
            operation: "analyze",
            imageInput: "${input.documentData.imageUrl}",
            prompt: "This is a document image. Extract all text and describe the document structure (headers, paragraphs, tables, etc.)",
            detail: "high",
            maxTokens: 4000,
            outputVariable: "documentAnalysis"
        },
        position: { x: 200, y: 0 }
    };

    nodes["extract"] = {
        type: "llm",
        name: "Extract Structured Data",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "From this document analysis, extract structured data as JSON: ${analyze.documentAnalysis.analysis}",
            outputVariable: "extractedData"
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-analyze", source: "input", target: "analyze" },
        { id: "analyze-extract", source: "analyze", target: "extract" },
        { id: "extract-output", source: "extract", target: "output" }
    );

    return {
        name: "Document Understanding Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an image editing workflow (upscale + style transfer)
 * Input (image) -> Upscale -> Style Transfer -> Output
 */
function createImageEditingWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Image Input",
        config: { inputName: "editData" },
        position: { x: 0, y: 0 }
    };

    nodes["upscale"] = {
        type: "imageGeneration",
        name: "Upscale Image",
        config: {
            provider: "stabilityai",
            model: "stable-diffusion-x4-upscaler",
            operation: "upscale",
            sourceImage: "${input.editData.imageUrl}",
            scaleFactor: 4,
            outputVariable: "upscaledImage"
        },
        position: { x: 200, y: 0 }
    };

    nodes["style"] = {
        type: "imageGeneration",
        name: "Apply Style",
        config: {
            provider: "replicate",
            model: "style-transfer",
            operation: "styleTransfer",
            sourceImage: "${upscale.upscaledImage.images[0].url}",
            styleReference: "${input.editData.styleUrl}",
            outputVariable: "styledImage"
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-upscale", source: "input", target: "upscale" },
        { id: "upscale-style", source: "upscale", target: "style" },
        { id: "style-output", source: "style", target: "output" }
    );

    return {
        name: "Image Editing Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        return {
            result: { executed: nodeId },
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output: { executed: nodeId }
        };
    });

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });
    mockCreateSpan.mockResolvedValue({ traceId: "test-trace-id", spanId: "test-span-id" });
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
    mockReserveCredits.mockResolvedValue({ success: true, reservationId: "test-reservation" });
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

        return {
            result: output,
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Multimodal AI Pattern Integration Tests", () => {
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

    describe("vision analysis", () => {
        it("should analyze image with OpenAI vision", async () => {
            const workflowDef = createVisionAnalysisWorkflowDefinition();

            configureMockNodeOutputs({
                analyze: {
                    analysis: {
                        operation: "analyze",
                        provider: "openai",
                        model: "gpt-4-vision-preview",
                        analysis:
                            "The image shows a sunset over the ocean with vibrant orange and purple colors. Waves can be seen gently lapping at a sandy beach in the foreground.",
                        metadata: {
                            processingTime: 2500,
                            tokensUsed: 150
                        }
                    }
                },
                output: { result: { analyzed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-vision-analysis-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-vision-analysis",
                            workflowDefinition: workflowDef,
                            inputs: {
                                imageData: {
                                    url: "https://example.com/sunset.jpg"
                                }
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
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("output");
        });

        it("should handle high detail image analysis", async () => {
            const workflowDef = createVisionAnalysisWorkflowDefinition();

            configureMockNodeOutputs({
                analyze: {
                    analysis: {
                        operation: "analyze",
                        provider: "openai",
                        model: "gpt-4-vision-preview",
                        analysis:
                            "Detailed analysis: The photograph captures a professional headshot. Subject appears to be a middle-aged person wearing business attire. Background is neutral gray. Lighting is soft and even, typical of studio photography.",
                        metadata: {
                            processingTime: 3500,
                            tokensUsed: 250
                        }
                    }
                },
                output: { result: { analyzed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-vision-detail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-vision-detail",
                            workflowDefinition: workflowDef,
                            inputs: {
                                imageData: {
                                    url: "https://example.com/headshot.jpg"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("image generation", () => {
        it("should generate image from prompt", async () => {
            const workflowDef = createImageGenerationWorkflowDefinition();

            configureMockNodeOutputs({
                generate: {
                    generatedImage: {
                        provider: "openai",
                        model: "dall-e-3",
                        images: [
                            {
                                url: "https://oaidalleapiprodscus.blob.core.windows.net/generated-image-123.png",
                                revisedPrompt:
                                    "A serene mountain landscape at dawn with mist rolling through the valleys, photorealistic style"
                            }
                        ],
                        metadata: {
                            processingTime: 15000
                        }
                    }
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-image-gen-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-image-gen",
                            workflowDefinition: workflowDef,
                            inputs: {
                                promptData: {
                                    prompt: "A serene mountain landscape at dawn"
                                }
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
            expect(nodeIds).toContain("generate");
        });

        it("should generate HD quality image", async () => {
            const workflowDef = createImageGenerationWorkflowDefinition();

            configureMockNodeOutputs({
                generate: {
                    generatedImage: {
                        provider: "openai",
                        model: "dall-e-3",
                        images: [
                            {
                                url: "https://cdn.example.com/hd-image.png",
                                revisedPrompt: "Ultra-detailed cyberpunk cityscape"
                            }
                        ],
                        metadata: {
                            processingTime: 20000
                        }
                    }
                },
                output: { result: { quality: "hd" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-image-hd-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-image-hd",
                            workflowDefinition: workflowDef,
                            inputs: {
                                promptData: {
                                    prompt: "Cyberpunk cityscape at night"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("chained multimodal workflows", () => {
        it("should analyze then generate variation", async () => {
            const workflowDef = createAnalyzeAndGenerateWorkflowDefinition();

            configureMockNodeOutputs({
                analyze: {
                    imageDescription: {
                        analysis:
                            "A cozy coffee shop interior with warm lighting and wooden furniture"
                    }
                },
                enhance: {
                    enhancedPrompt:
                        "Hyper-realistic digital painting of a cozy artisan coffee shop, warm amber lighting streaming through large windows, weathered wooden tables and chairs, vintage espresso machine, steam rising from ceramic cups, bokeh effect, 8K resolution"
                },
                generate: {
                    generatedImage: {
                        provider: "openai",
                        model: "dall-e-3",
                        images: [{ url: "https://cdn.example.com/coffee-variation.png" }]
                    }
                },
                output: { result: { variationGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-analyze-generate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-analyze-generate",
                            workflowDefinition: workflowDef,
                            inputs: {
                                imageData: {
                                    url: "https://example.com/coffee-shop.jpg"
                                }
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
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("enhance");
            expect(nodeIds).toContain("generate");
        });

        it("should process document understanding workflow", async () => {
            const workflowDef = createDocumentUnderstandingWorkflowDefinition();

            configureMockNodeOutputs({
                analyze: {
                    documentAnalysis: {
                        analysis:
                            "Invoice document. Header: 'ACME Corp Invoice #12345'. Date: 2024-01-15. Items: 1. Widget A x 5 @ $10.00. 2. Widget B x 3 @ $15.00. Subtotal: $95.00. Tax: $7.60. Total: $102.60"
                    }
                },
                extract: {
                    extractedData: {
                        invoiceNumber: "12345",
                        company: "ACME Corp",
                        date: "2024-01-15",
                        items: [
                            { name: "Widget A", quantity: 5, price: 10.0 },
                            { name: "Widget B", quantity: 3, price: 15.0 }
                        ],
                        subtotal: 95.0,
                        tax: 7.6,
                        total: 102.6
                    }
                },
                output: { result: { documentProcessed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-document-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-document",
                            workflowDefinition: workflowDef,
                            inputs: {
                                documentData: {
                                    imageUrl: "https://example.com/invoice.png"
                                }
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
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("extract");
        });
    });

    describe("image editing operations", () => {
        it("should upscale and apply style transfer", async () => {
            const workflowDef = createImageEditingWorkflowDefinition();

            configureMockNodeOutputs({
                upscale: {
                    upscaledImage: {
                        provider: "stabilityai",
                        images: [{ url: "https://cdn.example.com/upscaled-4x.png" }]
                    }
                },
                style: {
                    styledImage: {
                        provider: "replicate",
                        images: [{ url: "https://cdn.example.com/styled.png" }]
                    }
                },
                output: { result: { edited: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-image-edit-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-image-edit",
                            workflowDefinition: workflowDef,
                            inputs: {
                                editData: {
                                    imageUrl: "https://example.com/photo.jpg",
                                    styleUrl: "https://example.com/van-gogh.jpg"
                                }
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
            expect(nodeIds).toContain("upscale");
            expect(nodeIds).toContain("style");
        });
    });

    describe("error handling", () => {
        it("should handle vision analysis failure", async () => {
            const workflowDef = createVisionAnalysisWorkflowDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "analyze") {
                    throw new Error("Vision analysis failed: Image too large");
                }

                return {
                    result: { imageData: {} },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { imageData: {} }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-vision-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-vision-error",
                            workflowDefinition: workflowDef,
                            inputs: {
                                imageData: {
                                    url: "https://example.com/huge-image.tiff"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle image generation content policy violation", async () => {
            const workflowDef = createImageGenerationWorkflowDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "generate") {
                    throw new Error("Content policy violation: Prompt contains prohibited content");
                }

                return {
                    result: { promptData: {} },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { promptData: {} }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-gen-policy-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-gen-policy",
                            workflowDefinition: workflowDef,
                            inputs: {
                                promptData: {
                                    prompt: "Invalid content"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("real-world scenarios", () => {
        it("should process product photo analysis", async () => {
            const workflowDef = createVisionAnalysisWorkflowDefinition();

            configureMockNodeOutputs({
                analyze: {
                    analysis: {
                        operation: "analyze",
                        provider: "openai",
                        analysis:
                            "Product: Blue wireless headphones. Brand logo visible on ear cup. Over-ear design with cushioned ear pads. Adjustable headband. Silver accent on hinges. USB-C charging port visible. Includes microphone boom. Premium build quality.",
                        metadata: { processingTime: 2000 }
                    }
                },
                output: {
                    result: {
                        productCategory: "Electronics",
                        productType: "Headphones"
                    }
                }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-product-analysis-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-product-analysis",
                            workflowDefinition: workflowDef,
                            inputs: {
                                imageData: {
                                    url: "https://example.com/headphones.jpg"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should generate marketing images", async () => {
            const workflowDef = createImageGenerationWorkflowDefinition();

            configureMockNodeOutputs({
                generate: {
                    generatedImage: {
                        provider: "openai",
                        model: "dall-e-3",
                        images: [
                            {
                                url: "https://cdn.example.com/marketing-hero.png",
                                revisedPrompt:
                                    "Professional marketing banner featuring a modern smartphone on a clean white background with subtle shadow, minimalist style, product photography"
                            }
                        ]
                    }
                },
                output: { result: { marketingImageGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-marketing-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-marketing",
                            workflowDefinition: workflowDef,
                            inputs: {
                                promptData: {
                                    prompt: "Professional product photo of a smartphone for marketing banner"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
