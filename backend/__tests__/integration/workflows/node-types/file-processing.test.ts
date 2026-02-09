/**
 * File Processing Integration Tests
 *
 * True integration tests that execute file processing workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - File upload -> process -> store pipelines
 * - PDF parsing -> LLM analysis workflows
 * - CSV import -> transform -> export chains
 * - Image processing pipelines
 * - Multi-file batch processing
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

interface ProcessStep {
    id: string;
    type: string;
    config?: JsonObject;
}

/**
 * Create a file processing pipeline workflow definition
 * Input -> FileRead -> Process -> Store -> Output
 */
function createFileProcessingDefinition(processSteps: ProcessStep[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "File Input",
        config: { inputName: "file", inputType: "file" },
        position: { x: 0, y: 0 }
    };

    for (let i = 0; i < processSteps.length; i++) {
        const step = processSteps[i];
        const prevNode = i === 0 ? "input" : processSteps[i - 1].id;

        nodes[step.id] = {
            type: step.type,
            name: step.id,
            config: step.config || {},
            position: { x: (i + 1) * 200, y: 0 }
        };

        edges.push({
            id: `${prevNode}-${step.id}`,
            source: prevNode,
            target: step.id,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    const lastStep = processSteps.length > 0 ? processSteps[processSteps.length - 1].id : "input";
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: (processSteps.length + 1) * 200, y: 0 }
    };

    edges.push({
        id: `${lastStep}-output`,
        source: lastStep,
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "File Processing Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a multi-file parallel processing workflow definition
 * Input -> [FileProcess_1, FileProcess_2, ...] -> Merge -> Output
 */
function createParallelFileDefinition(fileCount: number): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];
    const fileNodeIds = Array.from({ length: fileCount }, (_, i) => `file_process_${i + 1}`);

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "files" },
        position: { x: 0, y: 100 }
    };

    fileNodeIds.forEach((nodeId, index) => {
        nodes[nodeId] = {
            type: "fileOperations",
            name: nodeId,
            config: { operation: "process", fileIndex: index },
            position: { x: 200, y: index * 100 }
        };

        edges.push({
            id: `input-${nodeId}`,
            source: "input",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    nodes["merge"] = {
        type: "transform",
        name: "Merge",
        config: { operation: "merge" },
        position: { x: 400, y: 100 }
    };

    for (const nodeId of fileNodeIds) {
        edges.push({
            id: `${nodeId}-merge`,
            source: nodeId,
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "merge-output",
        source: "merge",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: `Parallel File Processing (${fileCount} files)`,
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

describe("File Processing Integration Tests", () => {
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

    describe("PDF processing pipeline", () => {
        it("should execute PDF parse -> LLM analyze -> store pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "parse_pdf", type: "fileOperations", config: { operation: "parsePDF" } },
                {
                    id: "analyze",
                    type: "llm",
                    config: { provider: "openai", prompt: "Analyze this document" }
                },
                { id: "store", type: "fileOperations", config: { operation: "write" } }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "document.pdf", size: 1024, type: "application/pdf" } },
                parse_pdf: { text: "Extracted PDF content here...", pages: 5 },
                analyze: { summary: "Document analysis result", topics: ["finance", "Q3"] },
                store: { path: "/output/analysis.json", success: true },
                output: { result: "Analysis stored successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: { file: { name: "document.pdf" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("parse_pdf");
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("store");
        });

        it("should pass extracted text to LLM for analysis", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "parse_pdf", type: "fileOperations", config: { operation: "parsePDF" } },
                { id: "summarize", type: "llm", config: { provider: "openai" } }
            ]);

            let capturedContext: JsonObject | null = null;

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "summarize") {
                    capturedContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { file: "test.pdf" },
                    parse_pdf: { text: "PDF content to analyze", pageCount: 10 },
                    summarize: { summary: "Summarized content" },
                    output: { result: "done" }
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

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-llm-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-llm",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(capturedContext).not.toBeNull();
        });
    });

    describe("CSV import and transform", () => {
        it("should execute CSV parse -> transform -> export pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "parse_csv", type: "fileOperations", config: { operation: "parseCSV" } },
                { id: "transform", type: "transform", config: { operation: "map" } },
                {
                    id: "export",
                    type: "fileOperations",
                    config: { operation: "write", format: "json" }
                }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "data.csv", content: "id,name\n1,Alice\n2,Bob" } },
                parse_csv: {
                    rows: [
                        { id: "1", name: "Alice" },
                        { id: "2", name: "Bob" }
                    ],
                    headers: ["id", "name"]
                },
                transform: {
                    transformed: [
                        { id: 1, name: "ALICE" },
                        { id: 2, name: "BOB" }
                    ]
                },
                export: { path: "/output/data.json", recordCount: 2 },
                output: { result: "Export complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-csv-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-csv-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: { file: { name: "data.csv" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("parse_csv");
            expect(nodeIds).toContain("transform");
            expect(nodeIds).toContain("export");
        });

        it("should handle large CSV with row count metadata", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "parse_csv", type: "fileOperations", config: { operation: "parseCSV" } },
                { id: "aggregate", type: "transform", config: { operation: "reduce" } }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "large.csv", size: 5000000 } },
                parse_csv: {
                    rowCount: 10000,
                    headers: ["a", "b", "c"],
                    sampleRows: [{}, {}, {}]
                },
                aggregate: { totalRecords: 10000, summary: { sum: 50000, avg: 5 } },
                output: { result: "Aggregation complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-csv-large-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-csv-large",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("image processing", () => {
        it("should execute image upload -> resize -> analyze pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                {
                    id: "resize",
                    type: "fileOperations",
                    config: { operation: "resize", width: 800 }
                },
                {
                    id: "analyze",
                    type: "vision",
                    config: { provider: "openai", prompt: "Describe this image" }
                },
                { id: "store", type: "fileOperations", config: { operation: "write" } }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "photo.jpg", width: 4000, height: 3000 } },
                resize: {
                    file: { name: "photo_resized.jpg", width: 800, height: 600 },
                    resized: true
                },
                analyze: {
                    description: "A landscape photo with mountains",
                    tags: ["nature", "mountains"]
                },
                store: { path: "/output/photo_analyzed.json", success: true },
                output: { result: "Image processed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-image-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-image-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: { file: { name: "photo.jpg" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("resize");
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("store");
        });

        it("should process multiple images with OCR", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "ocr", type: "vision", config: { operation: "ocr" } },
                { id: "extract_data", type: "transform", config: { operation: "extract" } }
            ]);

            configureMockNodeOutputs({
                input: { files: [{ name: "receipt1.jpg" }, { name: "receipt2.jpg" }] },
                ocr: {
                    results: [
                        { text: "Total: $50.00", confidence: 0.95 },
                        { text: "Total: $75.00", confidence: 0.92 }
                    ]
                },
                extract_data: { totals: [50.0, 75.0], grandTotal: 125.0 },
                output: { result: "OCR complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-ocr-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-ocr",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("multi-file batch processing", () => {
        it("should process multiple files in parallel", async () => {
            const workflowDef = createParallelFileDefinition(3);

            configureMockNodeOutputs({
                input: { files: ["file1.txt", "file2.txt", "file3.txt"] },
                file_process_1: { processed: "file1", size: 100 },
                file_process_2: { processed: "file2", size: 200 },
                file_process_3: { processed: "file3", size: 150 },
                merge: { totalFiles: 3, totalSize: 450 },
                output: { result: "Batch complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-batch-files-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-batch-files",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("file_process_1");
            expect(nodeIds).toContain("file_process_2");
            expect(nodeIds).toContain("file_process_3");
            expect(nodeIds).toContain("merge");
        });

        it("should handle 10 files in parallel batch", async () => {
            const workflowDef = createParallelFileDefinition(10);

            const outputs: Record<string, JsonObject> = {
                input: { files: Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`) },
                merge: { totalFiles: 10 },
                output: { result: "done" }
            };

            for (let i = 1; i <= 10; i++) {
                outputs[`file_process_${i}`] = { processed: `file${i}`, index: i };
            }

            configureMockNodeOutputs(outputs);

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-batch-10-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-batch-10",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            for (let i = 1; i <= 10; i++) {
                expect(nodeIds).toContain(`file_process_${i}`);
            }
        });

        it("should handle partial failure in parallel processing", async () => {
            const workflowDef = createParallelFileDefinition(3);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "file_process_2") {
                    throw new Error("File corrupted");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { files: ["a", "b", "c"] },
                    file_process_1: { success: true },
                    file_process_3: { success: true },
                    merge: { partial: true, processed: 2 },
                    output: { result: "partial" }
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
                    workflowId: "test-batch-partial-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-batch-partial",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // Workflow should fail due to partial failure
            expect(result.success).toBe(false);
        });
    });

    describe("file upload and storage", () => {
        it("should execute upload -> validate -> store pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "validate", type: "code", config: { language: "javascript" } },
                {
                    id: "store",
                    type: "fileOperations",
                    config: { operation: "write", destination: "gcs" }
                }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "upload.pdf", size: 1000000, type: "application/pdf" } },
                validate: { valid: true, fileType: "pdf", sizeOk: true },
                store: { url: "gs://bucket/upload.pdf", success: true },
                output: { result: "Upload complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-upload-store-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-upload-store",
                            workflowDefinition: workflowDef,
                            inputs: { file: { name: "upload.pdf" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("validate");
            expect(nodeIds).toContain("store");
        });

        it("should reject invalid file types", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "validate", type: "code", config: { language: "javascript" } },
                { id: "store", type: "fileOperations", config: { operation: "write" } }
            ]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "validate") {
                    throw new Error("Invalid file type: exe not allowed");
                }

                return {
                    result: { file: { name: "malware.exe", type: "application/exe" } },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { file: { name: "malware.exe" } }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-invalid-file-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-invalid-file",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("document conversion", () => {
        it("should execute DOCX -> PDF conversion pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                {
                    id: "convert",
                    type: "fileOperations",
                    config: { operation: "convert", targetFormat: "pdf" }
                },
                { id: "compress", type: "fileOperations", config: { operation: "compress" } }
            ]);

            configureMockNodeOutputs({
                input: { file: { name: "document.docx", size: 500000 } },
                convert: { file: { name: "document.pdf", size: 450000 }, converted: true },
                compress: {
                    file: { name: "document_compressed.pdf", size: 200000 },
                    compression: 0.56
                },
                output: { result: "Conversion complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-convert-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-convert",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("convert");
            expect(nodeIds).toContain("compress");
        });
    });

    describe("error handling in file operations", () => {
        it("should handle file not found error", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "read", type: "fileOperations", config: { operation: "read" } }
            ]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "read") {
                    throw new Error("File not found: /nonexistent/file.txt");
                }

                return {
                    result: { path: "/nonexistent/file.txt" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { path: "/nonexistent/file.txt" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-file-not-found-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-file-not-found",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });

        it("should handle storage quota exceeded", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "store", type: "fileOperations", config: { operation: "write" } }
            ]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "store") {
                    throw new Error("Storage quota exceeded");
                }

                return {
                    result: { file: { size: 10000000000 } },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { file: { size: 10000000000 } }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-quota-exceeded-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-quota-exceeded",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("metadata handling", () => {
        it("should preserve file metadata through pipeline", async () => {
            const workflowDef = createFileProcessingDefinition([
                { id: "process", type: "fileOperations", config: { operation: "process" } }
            ]);

            configureMockNodeOutputs({
                input: {
                    file: {
                        name: "test.pdf",
                        size: 1024,
                        type: "application/pdf",
                        createdAt: "2024-01-01",
                        modifiedAt: "2024-01-15"
                    }
                },
                process: {
                    processed: true,
                    originalMetadata: {
                        name: "test.pdf",
                        createdAt: "2024-01-01"
                    }
                },
                output: { result: "done" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-metadata-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-metadata",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
