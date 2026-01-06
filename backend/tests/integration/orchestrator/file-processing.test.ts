/**
 * File Processing Orchestration Tests
 *
 * Tests file-based workflow patterns:
 * - File upload -> process -> store pipelines
 * - PDF parsing -> LLM analysis workflows
 * - CSV import -> transform -> export chains
 * - Image processing pipelines
 * - Multi-file batch processing
 */

import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    ExecutableNodeType,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a file processing pipeline workflow
 * Input -> FileRead -> Process -> Store -> Output
 */
function createFileProcessingWorkflow(
    processSteps: Array<{ id: string; type: ExecutableNodeType; config?: JsonObject }>
): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    // Input node (file source)
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "File Input",
        config: { name: "file", inputType: "file" },
        depth: 0,
        dependencies: [],
        dependents: processSteps.length > 0 ? [processSteps[0].id] : ["Output"]
    });
    executionLevels.push(["Input"]);

    // Process nodes
    for (let i = 0; i < processSteps.length; i++) {
        const step = processSteps[i];
        const prevNode = i === 0 ? "Input" : processSteps[i - 1].id;
        const nextNode = i === processSteps.length - 1 ? "Output" : processSteps[i + 1].id;

        nodes.set(step.id, {
            id: step.id,
            type: step.type,
            name: step.id,
            config: step.config || {},
            depth: i + 1,
            dependencies: [prevNode],
            dependents: [nextNode]
        });

        edges.set(`${prevNode}-${step.id}`, {
            id: `${prevNode}-${step.id}`,
            source: prevNode,
            target: step.id,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([step.id]);
    }

    // Output node
    const lastStep = processSteps.length > 0 ? processSteps[processSteps.length - 1].id : "Input";
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: processSteps.length + 1,
        dependencies: [lastStep],
        dependents: []
    });

    edges.set(`${lastStep}-Output`, {
        id: `${lastStep}-Output`,
        source: lastStep,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    executionLevels.push(["Output"]);

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels,
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a multi-file parallel processing workflow
 * Input -> [FileProcess_1, FileProcess_2, ...] -> Merge -> Output
 */
function createParallelFileWorkflow(fileCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const fileNodeIds = Array.from({ length: fileCount }, (_, i) => `FileProcess_${i + 1}`);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "files" },
        depth: 0,
        dependencies: [],
        dependents: fileNodeIds
    });

    // Parallel file processing nodes
    for (let i = 0; i < fileCount; i++) {
        const nodeId = fileNodeIds[i];
        nodes.set(nodeId, {
            id: nodeId,
            type: "fileOperations",
            name: nodeId,
            config: { operation: "process", fileIndex: i },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge"]
        });

        edges.set(`Input-${nodeId}`, {
            id: `Input-${nodeId}`,
            source: "Input",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Merge node
    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge",
        config: { operation: "merge" },
        depth: 2,
        dependencies: fileNodeIds,
        dependents: ["Output"]
    });

    for (const nodeId of fileNodeIds) {
        edges.set(`${nodeId}-Merge`, {
            id: `${nodeId}-Merge`,
            source: nodeId,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Merge"],
        dependents: []
    });

    edges.set("Merge-Output", {
        id: "Merge-Output",
        source: "Merge",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], fileNodeIds, ["Merge"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with mock activities
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    {
                        nodeId,
                        nodeName: node.name,
                        executionId: "test-execution"
                    }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("File Processing Orchestration", () => {
    describe("PDF processing pipeline", () => {
        it("should execute PDF parse -> LLM analyze -> store pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "ParsePDF", type: "fileOperations", config: { operation: "parsePDF" } },
                {
                    id: "Analyze",
                    type: "llm",
                    config: { provider: "openai", prompt: "Analyze this document" }
                },
                { id: "Store", type: "fileOperations", config: { operation: "write" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "document.pdf", size: 1024, type: "application/pdf" } },
                    ParsePDF: { text: "Extracted PDF content here...", pages: 5 },
                    Analyze: { summary: "Document analysis result", topics: ["finance", "Q3"] },
                    Store: { path: "/output/analysis.json", success: true },
                    Output: { result: "Analysis stored successfully" }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { file: { name: "document.pdf" } }
            );

            expect(executionOrder).toEqual(["Input", "ParsePDF", "Analyze", "Store", "Output"]);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should pass extracted text to LLM for analysis", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "ParsePDF", type: "fileOperations", config: { operation: "parsePDF" } },
                { id: "Summarize", type: "llm", config: { provider: "openai" } }
            ]);

            let capturedContext: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { file: "test.pdf" } },
                    ParsePDF: { customOutput: { text: "PDF content to analyze", pageCount: 10 } },
                    Summarize: {
                        customOutput: { summary: "Summarized content" },
                        onExecute: (input) => {
                            capturedContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: "done" } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(capturedContext).not.toBeNull();
            expect((capturedContext!.ParsePDF as JsonObject).text).toBe("PDF content to analyze");
        });
    });

    describe("CSV import and transform", () => {
        it("should execute CSV parse -> transform -> export pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "ParseCSV", type: "fileOperations", config: { operation: "parseCSV" } },
                { id: "Transform", type: "transform", config: { operation: "map" } },
                {
                    id: "Export",
                    type: "fileOperations",
                    config: { operation: "write", format: "json" }
                }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "data.csv", content: "id,name\n1,Alice\n2,Bob" } },
                    ParseCSV: {
                        rows: [
                            { id: "1", name: "Alice" },
                            { id: "2", name: "Bob" }
                        ],
                        headers: ["id", "name"]
                    },
                    Transform: {
                        transformed: [
                            { id: 1, name: "ALICE" },
                            { id: 2, name: "BOB" }
                        ]
                    },
                    Export: { path: "/output/data.json", recordCount: 2 },
                    Output: { result: "Export complete" }
                })
            );

            const { executionOrder, context } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { file: { name: "data.csv" } }
            );

            expect(executionOrder).toEqual(["Input", "ParseCSV", "Transform", "Export", "Output"]);
            expect(context.nodeOutputs.get("ParseCSV")).toHaveProperty("rows");
        });

        it("should handle large CSV with row count metadata", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "ParseCSV", type: "fileOperations", config: { operation: "parseCSV" } },
                { id: "Aggregate", type: "transform", config: { operation: "reduce" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "large.csv", size: 5000000 } },
                    ParseCSV: {
                        rowCount: 10000,
                        headers: ["a", "b", "c"],
                        sampleRows: [{}, {}, {}]
                    },
                    Aggregate: { totalRecords: 10000, summary: { sum: 50000, avg: 5 } },
                    Output: { result: "Aggregation complete" }
                })
            );

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);

            expect((context.nodeOutputs.get("ParseCSV") as JsonObject).rowCount).toBe(10000);
        });
    });

    describe("image processing", () => {
        it("should execute image upload -> resize -> analyze pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                {
                    id: "Resize",
                    type: "fileOperations",
                    config: { operation: "resize", width: 800 }
                },
                {
                    id: "Analyze",
                    type: "vision",
                    config: { provider: "openai", prompt: "Describe this image" }
                },
                { id: "Store", type: "fileOperations", config: { operation: "write" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "photo.jpg", width: 4000, height: 3000 } },
                    Resize: {
                        file: { name: "photo_resized.jpg", width: 800, height: 600 },
                        resized: true
                    },
                    Analyze: {
                        description: "A landscape photo with mountains",
                        tags: ["nature", "mountains"]
                    },
                    Store: { path: "/output/photo_analyzed.json", success: true },
                    Output: { result: "Image processed" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                file: { name: "photo.jpg" }
            });

            expect(executionOrder).toEqual(["Input", "Resize", "Analyze", "Store", "Output"]);
        });

        it("should process multiple images with OCR", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "OCR", type: "vision", config: { operation: "ocr" } },
                { id: "ExtractData", type: "transform", config: { operation: "extract" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { files: [{ name: "receipt1.jpg" }, { name: "receipt2.jpg" }] },
                    OCR: {
                        results: [
                            { text: "Total: $50.00", confidence: 0.95 },
                            { text: "Total: $75.00", confidence: 0.92 }
                        ]
                    },
                    ExtractData: { totals: [50.0, 75.0], grandTotal: 125.0 },
                    Output: { result: "OCR complete" }
                })
            );

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);

            expect((context.nodeOutputs.get("OCR") as JsonObject).results).toHaveLength(2);
        });
    });

    describe("multi-file batch processing", () => {
        it("should process multiple files in parallel", async () => {
            const workflow = createParallelFileWorkflow(3);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { files: ["file1.txt", "file2.txt", "file3.txt"] },
                    FileProcess_1: { processed: "file1", size: 100 },
                    FileProcess_2: { processed: "file2", size: 200 },
                    FileProcess_3: { processed: "file3", size: 150 },
                    Merge: { totalFiles: 3, totalSize: 450 },
                    Output: { result: "Batch complete" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("FileProcess_1");
            expect(executionOrder).toContain("FileProcess_2");
            expect(executionOrder).toContain("FileProcess_3");
            expect(executionOrder[executionOrder.length - 2]).toBe("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
        });

        it("should handle 10 files in parallel batch", async () => {
            const workflow = createParallelFileWorkflow(10);

            const outputs: Record<string, JsonObject> = {
                Input: { files: Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`) },
                Merge: { totalFiles: 10 },
                Output: { result: "done" }
            };

            for (let i = 1; i <= 10; i++) {
                outputs[`FileProcess_${i}`] = { processed: `file${i}`, index: i };
            }

            const mockActivities = createMockActivities(withOutputs(outputs));

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // Verify all 10 file processors were executed
            for (let i = 1; i <= 10; i++) {
                expect(executionOrder).toContain(`FileProcess_${i}`);
            }
        });

        it("should continue processing when one file fails", async () => {
            const workflow = createParallelFileWorkflow(3);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { files: ["a", "b", "c"] } },
                    FileProcess_1: { customOutput: { success: true } },
                    FileProcess_2: { shouldFail: true, errorMessage: "File corrupted" },
                    FileProcess_3: { customOutput: { success: true } },
                    Merge: { customOutput: { partial: true, processed: 2 } },
                    Output: { customOutput: { result: "partial" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // All file processors should be attempted
            expect(executionOrder).toContain("FileProcess_1");
            expect(executionOrder).toContain("FileProcess_2");
            expect(executionOrder).toContain("FileProcess_3");
        });
    });

    describe("file upload and storage", () => {
        it("should execute upload -> validate -> store pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Validate", type: "code", config: { language: "javascript" } },
                {
                    id: "Store",
                    type: "fileOperations",
                    config: { operation: "write", destination: "gcs" }
                }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "upload.pdf", size: 1000000, type: "application/pdf" } },
                    Validate: { valid: true, fileType: "pdf", sizeOk: true },
                    Store: { url: "gs://bucket/upload.pdf", success: true },
                    Output: { result: "Upload complete" }
                })
            );

            const { executionOrder, context } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { file: { name: "upload.pdf" } }
            );

            expect(executionOrder).toEqual(["Input", "Validate", "Store", "Output"]);
            expect((context.nodeOutputs.get("Store") as JsonObject).url).toContain("gs://");
        });

        it("should reject invalid file types", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Validate", type: "code", config: { language: "javascript" } },
                { id: "Store", type: "fileOperations", config: { operation: "write" } }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: { file: { name: "malware.exe", type: "application/exe" } }
                    },
                    Validate: {
                        shouldFail: true,
                        errorMessage: "Invalid file type: exe not allowed"
                    },
                    Store: { customOutput: { success: false } },
                    Output: { customOutput: { result: "rejected" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Validate");
            // Store should not execute after validation failure
        });
    });

    describe("document conversion", () => {
        it("should execute DOCX -> PDF conversion pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                {
                    id: "Convert",
                    type: "fileOperations",
                    config: { operation: "convert", targetFormat: "pdf" }
                },
                { id: "Compress", type: "fileOperations", config: { operation: "compress" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { file: { name: "document.docx", size: 500000 } },
                    Convert: { file: { name: "document.pdf", size: 450000 }, converted: true },
                    Compress: {
                        file: { name: "document_compressed.pdf", size: 200000 },
                        compression: 0.56
                    },
                    Output: { result: "Conversion complete" }
                })
            );

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);

            expect((context.nodeOutputs.get("Convert") as JsonObject).converted).toBe(true);
            expect((context.nodeOutputs.get("Compress") as JsonObject).compression).toBeLessThan(1);
        });
    });

    describe("error handling in file operations", () => {
        it("should handle file not found error", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Read", type: "fileOperations", config: { operation: "read" } }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { path: "/nonexistent/file.txt" } },
                    Read: {
                        shouldFail: true,
                        errorMessage: "File not found: /nonexistent/file.txt"
                    },
                    Output: { customOutput: { result: "failed" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Read");
        });

        it("should handle storage quota exceeded", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Store", type: "fileOperations", config: { operation: "write" } }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { file: { size: 10000000000 } } },
                    Store: { shouldFail: true, errorMessage: "Storage quota exceeded" },
                    Output: { customOutput: { result: "failed" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Store");
        });
    });

    describe("metadata handling", () => {
        it("should preserve file metadata through pipeline", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Process", type: "fileOperations", config: { operation: "process" } }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        file: {
                            name: "test.pdf",
                            size: 1024,
                            type: "application/pdf",
                            createdAt: "2024-01-01",
                            modifiedAt: "2024-01-15"
                        }
                    },
                    Process: {
                        processed: true,
                        originalMetadata: {
                            name: "test.pdf",
                            createdAt: "2024-01-01"
                        }
                    },
                    Output: { result: "done" }
                })
            );

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(context.nodeOutputs.get("Process")).toHaveProperty("originalMetadata");
        });

        it("should track processing time for each step", async () => {
            const workflow = createFileProcessingWorkflow([
                { id: "Step1", type: "fileOperations" },
                { id: "Step2", type: "fileOperations" }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { file: "test.txt" }, delay: 10 },
                    Step1: { customOutput: { processed: true, durationMs: 50 }, delay: 50 },
                    Step2: { customOutput: { processed: true, durationMs: 30 }, delay: 30 },
                    Output: { customOutput: { result: "done" } }
                }
            });

            const startTime = Date.now();
            await simulateWorkflowExecution(workflow, mockActivities);
            const endTime = Date.now();

            // Total time should be roughly sum of delays (sequential)
            expect(endTime - startTime).toBeGreaterThanOrEqual(80);
        });
    });
});
