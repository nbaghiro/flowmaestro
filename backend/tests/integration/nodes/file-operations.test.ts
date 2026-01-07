/**
 * File Operations Node Integration Tests
 *
 * Tests file operations in workflow context:
 * - File reading (local path, URL)
 * - File writing
 * - PDF parsing
 * - CSV parsing
 * - JSON parsing
 * - File processing pipelines
 */

import {
    createContext,
    storeNodeOutput,
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
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a file read workflow: Input -> ReadFile -> Transform -> Output
 */
function createFileReadWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "filePath" },
        depth: 0,
        dependencies: [],
        dependents: ["ReadFile"]
    });

    nodes.set("ReadFile", {
        id: "ReadFile",
        type: "fileOperations",
        name: "Read File",
        config: {
            operation: "read",
            fileSource: "path",
            filePath: "{{Input.filePath}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Transform"]
    });

    nodes.set("Transform", {
        id: "Transform",
        type: "transform",
        name: "Process Content",
        config: {
            operation: "custom",
            expression: "content.toUpperCase()"
        },
        depth: 2,
        dependencies: ["ReadFile"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Transform"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "ReadFile"],
        ["ReadFile", "Transform"],
        ["Transform", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["ReadFile"], ["Transform"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a PDF processing workflow: Input -> ParsePDF -> Extract -> LLM -> Output
 */
function createPDFProcessingWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "pdfUrl" },
        depth: 0,
        dependencies: [],
        dependents: ["ParsePDF"]
    });

    nodes.set("ParsePDF", {
        id: "ParsePDF",
        type: "fileOperations",
        name: "Parse PDF",
        config: {
            operation: "parsePDF",
            fileSource: "url",
            filePath: "{{Input.pdfUrl}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["ExtractData"]
    });

    nodes.set("ExtractData", {
        id: "ExtractData",
        type: "transform",
        name: "Extract Data",
        config: {
            operation: "extract",
            pattern: "Invoice Number: (\\d+)"
        },
        depth: 2,
        dependencies: ["ParsePDF"],
        dependents: ["Summarize"]
    });

    nodes.set("Summarize", {
        id: "Summarize",
        type: "llm",
        name: "Summarize Content",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Summarize this document: {{ExtractData.content}}"
        },
        depth: 3,
        dependencies: ["ExtractData"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "summary" },
        depth: 4,
        dependencies: ["Summarize"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "ParsePDF"],
        ["ParsePDF", "ExtractData"],
        ["ExtractData", "Summarize"],
        ["Summarize", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["ParsePDF"], ["ExtractData"], ["Summarize"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a CSV processing workflow: Input -> ParseCSV -> Transform -> Database -> Output
 */
function createCSVImportWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "csvPath" },
        depth: 0,
        dependencies: [],
        dependents: ["ParseCSV"]
    });

    nodes.set("ParseCSV", {
        id: "ParseCSV",
        type: "fileOperations",
        name: "Parse CSV",
        config: {
            operation: "parseCSV",
            fileSource: "path",
            filePath: "{{Input.csvPath}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["ValidateData"]
    });

    nodes.set("ValidateData", {
        id: "ValidateData",
        type: "transform",
        name: "Validate Data",
        config: {
            operation: "filter",
            expression: "row.email && row.email.includes('@')"
        },
        depth: 2,
        dependencies: ["ParseCSV"],
        dependents: ["ImportToDB"]
    });

    nodes.set("ImportToDB", {
        id: "ImportToDB",
        type: "database",
        name: "Import to Database",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "insert",
            parameters: {
                table: "imported_users",
                data: "{{ValidateData.result}}"
            }
        },
        depth: 3,
        dependencies: ["ValidateData"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "importResult" },
        depth: 4,
        dependencies: ["ImportToDB"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "ParseCSV"],
        ["ParseCSV", "ValidateData"],
        ["ValidateData", "ImportToDB"],
        ["ImportToDB", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["ParseCSV"], ["ValidateData"], ["ImportToDB"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a file write workflow: Input -> Transform -> WriteFile -> Output
 */
function createFileWriteWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "reportData" },
        depth: 0,
        dependencies: [],
        dependents: ["FormatReport"]
    });

    nodes.set("FormatReport", {
        id: "FormatReport",
        type: "transform",
        name: "Format Report",
        config: {
            operation: "custom",
            expression: "JSON.stringify(data, null, 2)"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["WriteFile"]
    });

    nodes.set("WriteFile", {
        id: "WriteFile",
        type: "fileOperations",
        name: "Write Report",
        config: {
            operation: "write",
            outputPath: "/tmp/reports/{{Input.reportId}}.json",
            content: "{{FormatReport.result}}",
            format: "json"
        },
        depth: 2,
        dependencies: ["FormatReport"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "fileInfo" },
        depth: 3,
        dependencies: ["WriteFile"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "FormatReport"],
        ["FormatReport", "WriteFile"],
        ["WriteFile", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["FormatReport"], ["WriteFile"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a multi-file processing workflow: Input -> [ParseA, ParseB, ParseC] -> Merge -> Output
 */
function createMultiFileWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "files" },
        depth: 0,
        dependencies: [],
        dependents: ["ParsePDF", "ParseCSV", "ParseJSON"]
    });

    // Parallel file parsers
    nodes.set("ParsePDF", {
        id: "ParsePDF",
        type: "fileOperations",
        name: "Parse PDF",
        config: {
            operation: "parsePDF",
            fileSource: "path",
            filePath: "{{Input.files.pdf}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Merge"]
    });

    nodes.set("ParseCSV", {
        id: "ParseCSV",
        type: "fileOperations",
        name: "Parse CSV",
        config: {
            operation: "parseCSV",
            fileSource: "path",
            filePath: "{{Input.files.csv}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Merge"]
    });

    nodes.set("ParseJSON", {
        id: "ParseJSON",
        type: "fileOperations",
        name: "Parse JSON",
        config: {
            operation: "parseJSON",
            fileSource: "path",
            filePath: "{{Input.files.json}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Merge"]
    });

    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge Results",
        config: { operation: "merge" },
        depth: 2,
        dependencies: ["ParsePDF", "ParseCSV", "ParseJSON"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "combinedData" },
        depth: 3,
        dependencies: ["Merge"],
        dependents: []
    });

    // Edges
    edges.set("Input-ParsePDF", {
        id: "Input-ParsePDF",
        source: "Input",
        target: "ParsePDF",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Input-ParseCSV", {
        id: "Input-ParseCSV",
        source: "Input",
        target: "ParseCSV",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Input-ParseJSON", {
        id: "Input-ParseJSON",
        source: "Input",
        target: "ParseJSON",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("ParsePDF-Merge", {
        id: "ParsePDF-Merge",
        source: "ParsePDF",
        target: "Merge",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("ParseCSV-Merge", {
        id: "ParseCSV-Merge",
        source: "ParseCSV",
        target: "Merge",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("ParseJSON-Merge", {
        id: "ParseJSON-Merge",
        source: "ParseJSON",
        target: "Merge",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
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
        executionLevels: [["Input"], ["ParsePDF", "ParseCSV", "ParseJSON"], ["Merge"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    failedNodes: string[];
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const failedNodes: string[] = [];

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
                    failedNodes.push(nodeId);
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                failedNodes.push(nodeId);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                queueState = markFailed(queueState, nodeId, errorMessage, workflow);
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("File Operations Node Integration", () => {
    describe("file reading", () => {
        it("should read file from local path in workflow", async () => {
            const workflow = createFileReadWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { filePath: "/data/input.txt" },
                    ReadFile: {
                        content: "Hello, World!",
                        metadata: { size: 13 }
                    },
                    Transform: { result: "HELLO, WORLD!" },
                    Output: { result: "HELLO, WORLD!" }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { filePath: "/data/input.txt" }
            );

            expect(executionOrder).toEqual(["Input", "ReadFile", "Transform", "Output"]);
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should read file from URL in workflow", async () => {
            const workflow = createFileReadWorkflow();
            // Modify workflow to use URL source
            workflow.nodes.get("ReadFile")!.config = {
                operation: "read",
                fileSource: "url",
                filePath: "{{Input.fileUrl}}"
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { fileUrl: "https://example.com/data.txt" },
                    ReadFile: {
                        content: "Remote file content",
                        metadata: { size: 19 }
                    },
                    Transform: { result: "REMOTE FILE CONTENT" },
                    Output: { result: "REMOTE FILE CONTENT" }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { fileUrl: "https://example.com/data.txt" }
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should handle file not found error", async () => {
            const workflow = createFileReadWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { filePath: "/nonexistent/file.txt" } },
                    ReadFile: {
                        shouldFail: true,
                        errorMessage: "ENOENT: no such file or directory"
                    },
                    Transform: { customOutput: { result: "" } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("ReadFile");
        });
    });

    describe("PDF parsing", () => {
        it("should parse PDF and extract text in workflow", async () => {
            const workflow = createPDFProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { pdfUrl: "https://example.com/document.pdf" },
                    ParsePDF: {
                        content: "Invoice Number: 12345\nTotal: $500.00\nDate: 2024-01-15",
                        metadata: { size: 50000, pages: 2, format: "pdf" }
                    },
                    ExtractData: {
                        content: "Invoice Number: 12345",
                        invoiceNumber: "12345"
                    },
                    Summarize: {
                        content: "This is an invoice document #12345 with a total of $500."
                    },
                    Output: { summary: "Invoice #12345 - $500.00" }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { pdfUrl: "https://example.com/document.pdf" }
            );

            expect(executionOrder).toEqual([
                "Input",
                "ParsePDF",
                "ExtractData",
                "Summarize",
                "Output"
            ]);
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle corrupted PDF", async () => {
            const workflow = createPDFProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { pdfUrl: "https://example.com/corrupted.pdf" } },
                    ParsePDF: {
                        shouldFail: true,
                        errorMessage: "Invalid PDF structure"
                    },
                    ExtractData: { customOutput: { content: "" } },
                    Summarize: { customOutput: { content: "" } },
                    Output: { customOutput: { summary: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("ParsePDF");
        });

        it("should handle PDF with multiple pages", async () => {
            const workflow = createPDFProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { pdfUrl: "https://example.com/long-document.pdf" },
                    ParsePDF: {
                        content: "Page 1 content...\nPage 2 content...\nPage 3 content...",
                        metadata: { size: 150000, pages: 3, format: "pdf" }
                    },
                    ExtractData: { content: "Extracted data from 3 pages" },
                    Summarize: { content: "Summary of 3-page document" },
                    Output: { summary: "Document processed" }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("CSV parsing", () => {
        it("should parse CSV and import to database", async () => {
            const workflow = createCSVImportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { csvPath: "/data/users.csv" },
                    ParseCSV: {
                        content: JSON.stringify([
                            { name: "Alice", email: "alice@example.com" },
                            { name: "Bob", email: "bob@example.com" }
                        ]),
                        metadata: { size: 100, format: "csv" }
                    },
                    ValidateData: {
                        result: [
                            { name: "Alice", email: "alice@example.com" },
                            { name: "Bob", email: "bob@example.com" }
                        ]
                    },
                    ImportToDB: {
                        operation: "insert",
                        success: true,
                        data: { rowsInserted: 2 }
                    },
                    Output: { importResult: { imported: 2 } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { csvPath: "/data/users.csv" }
            );

            expect(executionOrder).toEqual([
                "Input",
                "ParseCSV",
                "ValidateData",
                "ImportToDB",
                "Output"
            ]);
            expect(failedNodes).toHaveLength(0);
        });

        it("should filter out invalid rows during CSV import", async () => {
            const workflow = createCSVImportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { csvPath: "/data/users.csv" },
                    ParseCSV: {
                        content: JSON.stringify([
                            { name: "Alice", email: "alice@example.com" },
                            { name: "Bob", email: "invalid-email" },
                            { name: "Charlie", email: "charlie@example.com" }
                        ])
                    },
                    ValidateData: {
                        result: [
                            { name: "Alice", email: "alice@example.com" },
                            { name: "Charlie", email: "charlie@example.com" }
                        ]
                    },
                    ImportToDB: {
                        operation: "insert",
                        success: true,
                        data: { rowsInserted: 2 }
                    },
                    Output: { importResult: { imported: 2, filtered: 1 } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toHaveLength(0);
        });

        it("should handle malformed CSV", async () => {
            const workflow = createCSVImportWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { csvPath: "/data/malformed.csv" } },
                    ParseCSV: {
                        shouldFail: true,
                        errorMessage: "Unexpected character at line 3"
                    },
                    ValidateData: { customOutput: { result: [] } },
                    ImportToDB: { customOutput: { success: false } },
                    Output: { customOutput: { importResult: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("ParseCSV");
        });
    });

    describe("file writing", () => {
        it("should format data and write to file", async () => {
            const workflow = createFileWriteWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportData: { sales: 1000, date: "2024-01-15" },
                        reportId: "report-123"
                    },
                    FormatReport: { result: '{\n  "sales": 1000,\n  "date": "2024-01-15"\n}' },
                    WriteFile: {
                        filePath: "/tmp/reports/report-123.json",
                        metadata: { size: 45, format: "json" }
                    },
                    Output: { fileInfo: { path: "/tmp/reports/report-123.json" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { reportData: { sales: 1000, date: "2024-01-15" }, reportId: "report-123" }
            );

            expect(executionOrder).toEqual(["Input", "FormatReport", "WriteFile", "Output"]);
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle write permission error", async () => {
            const workflow = createFileWriteWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { reportData: {}, reportId: "test" } },
                    FormatReport: { customOutput: { result: "{}" } },
                    WriteFile: {
                        shouldFail: true,
                        errorMessage: "EACCES: permission denied"
                    },
                    Output: { customOutput: { fileInfo: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("WriteFile");
        });

        it("should handle disk full error", async () => {
            const workflow = createFileWriteWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { reportData: {}, reportId: "test" } },
                    FormatReport: { customOutput: { result: "{}" } },
                    WriteFile: {
                        shouldFail: true,
                        errorMessage: "ENOSPC: no space left on device"
                    },
                    Output: { customOutput: { fileInfo: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("WriteFile");
        });
    });

    describe("parallel file processing", () => {
        it("should process multiple file types in parallel", async () => {
            const workflow = createMultiFileWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        files: {
                            pdf: "/data/doc.pdf",
                            csv: "/data/data.csv",
                            json: "/data/config.json"
                        }
                    },
                    ParsePDF: {
                        content: "PDF text content",
                        metadata: { pages: 1 }
                    },
                    ParseCSV: {
                        content: JSON.stringify([{ a: 1 }, { a: 2 }])
                    },
                    ParseJSON: {
                        content: JSON.stringify({ key: "value" })
                    },
                    Merge: {
                        pdf: "PDF text content",
                        csv: [{ a: 1 }, { a: 2 }],
                        json: { key: "value" }
                    },
                    Output: { combinedData: {} }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            // Input first, then parallel parsers, then merge, then output
            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("ParsePDF");
            expect(executionOrder).toContain("ParseCSV");
            expect(executionOrder).toContain("ParseJSON");
            expect(executionOrder).toContain("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle partial failure in parallel processing", async () => {
            const workflow = createMultiFileWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            files: { pdf: "/doc.pdf", csv: "/data.csv", json: "/config.json" }
                        }
                    },
                    ParsePDF: {
                        customOutput: { content: "PDF content" }
                    },
                    ParseCSV: {
                        shouldFail: true,
                        errorMessage: "CSV parsing failed"
                    },
                    ParseJSON: {
                        customOutput: { content: '{"key": "value"}' }
                    },
                    Merge: { customOutput: { partial: true } },
                    Output: { customOutput: { combinedData: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("ParseCSV");
        });
    });

    describe("JSON parsing", () => {
        it("should parse JSON file in workflow", async () => {
            const workflow = createFileReadWorkflow();
            // Modify workflow to parse JSON
            workflow.nodes.get("ReadFile")!.config = {
                operation: "parseJSON",
                fileSource: "path",
                filePath: "{{Input.filePath}}"
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { filePath: "/data/config.json" },
                    ReadFile: {
                        content: JSON.stringify({ setting: "value", count: 42 }, null, 2),
                        metadata: { size: 50, format: "json" }
                    },
                    Transform: { result: { setting: "value", count: 42 } },
                    Output: { result: { setting: "value" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities, {
                filePath: "/data/config.json"
            });

            expect(failedNodes).toHaveLength(0);
        });

        it("should handle invalid JSON", async () => {
            const workflow = createFileReadWorkflow();
            workflow.nodes.get("ReadFile")!.config = {
                operation: "parseJSON",
                fileSource: "path",
                filePath: "{{Input.filePath}}"
            };

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { filePath: "/data/invalid.json" } },
                    ReadFile: {
                        shouldFail: true,
                        errorMessage: "Invalid JSON: Unexpected token at position 10"
                    },
                    Transform: { customOutput: { result: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("ReadFile");
        });
    });

    describe("real-world scenarios", () => {
        it("should process invoice PDF and update database", async () => {
            const workflow = createPDFProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { pdfUrl: "https://storage.example.com/invoices/INV-001.pdf" },
                    ParsePDF: {
                        content:
                            "INVOICE\n" +
                            "Invoice Number: INV-001\n" +
                            "Date: 2024-01-15\n" +
                            "Customer: Acme Corp\n" +
                            "Total: $1,500.00",
                        metadata: { pages: 1 }
                    },
                    ExtractData: {
                        invoiceNumber: "INV-001",
                        date: "2024-01-15",
                        customer: "Acme Corp",
                        total: 1500.0
                    },
                    Summarize: {
                        content: "Invoice INV-001 from Acme Corp dated 2024-01-15 for $1,500.00"
                    },
                    Output: {
                        summary: {
                            invoiceNumber: "INV-001",
                            processed: true
                        }
                    }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.summary).toBeDefined();
        });

        it("should batch import CSV users with validation", async () => {
            const workflow = createCSVImportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { csvPath: "/uploads/users-batch-2024.csv" },
                    ParseCSV: {
                        content: JSON.stringify([
                            { name: "User 1", email: "user1@company.com", role: "admin" },
                            { name: "User 2", email: "user2@company.com", role: "user" },
                            { name: "User 3", email: "user3@company.com", role: "user" },
                            { name: "Invalid", email: "not-an-email", role: "user" },
                            { name: "User 4", email: "user4@company.com", role: "viewer" }
                        ])
                    },
                    ValidateData: {
                        result: [
                            { name: "User 1", email: "user1@company.com", role: "admin" },
                            { name: "User 2", email: "user2@company.com", role: "user" },
                            { name: "User 3", email: "user3@company.com", role: "user" },
                            { name: "User 4", email: "user4@company.com", role: "viewer" }
                        ],
                        invalidCount: 1
                    },
                    ImportToDB: {
                        success: true,
                        data: { rowsInserted: 4 }
                    },
                    Output: {
                        importResult: {
                            total: 5,
                            imported: 4,
                            rejected: 1
                        }
                    }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.importResult).toBeDefined();
        });

        it("should generate and save report file", async () => {
            const workflow = createFileWriteWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportData: {
                            title: "Monthly Sales Report",
                            period: "January 2024",
                            totalSales: 125000,
                            transactions: 450,
                            topProducts: ["Widget A", "Widget B", "Widget C"]
                        },
                        reportId: "sales-2024-01"
                    },
                    FormatReport: {
                        result: JSON.stringify(
                            {
                                title: "Monthly Sales Report",
                                period: "January 2024",
                                totalSales: 125000,
                                transactions: 450,
                                topProducts: ["Widget A", "Widget B", "Widget C"],
                                generatedAt: "2024-02-01T00:00:00Z"
                            },
                            null,
                            2
                        )
                    },
                    WriteFile: {
                        filePath: "/tmp/reports/sales-2024-01.json",
                        metadata: { size: 250, format: "json" }
                    },
                    Output: {
                        fileInfo: {
                            path: "/tmp/reports/sales-2024-01.json",
                            size: 250
                        }
                    }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.fileInfo).toBeDefined();
        });
    });
});
