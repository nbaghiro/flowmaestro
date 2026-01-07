/**
 * Document Processing Workflow Tests
 *
 * Tests a realistic document processing pipeline:
 * Upload → OCR/Parse → LLM Analysis → Store → Notify
 *
 * Simulates document ingestion with AI-powered extraction and classification.
 */

import type { JsonObject } from "@flowmaestro/shared";
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
    TypedEdge,
    EdgeHandleType
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createDocumentProcessingWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Document Input",
        config: { name: "document" },
        depth: 0,
        dependencies: [],
        dependents: ["DetectType"]
    });

    nodes.set("DetectType", {
        id: "DetectType",
        type: "switch",
        name: "Detect Document Type",
        config: {
            expression: "{{Input.document.fileType}}",
            cases: [
                { value: "pdf", label: "PDF" },
                { value: "image", label: "Image" },
                { value: "docx", label: "Word" }
            ],
            defaultCase: "unknown"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["ParsePDF", "OCRImage", "ParseWord"]
    });

    // PDF Parser branch
    nodes.set("ParsePDF", {
        id: "ParsePDF",
        type: "fileOperations",
        name: "Parse PDF",
        config: {
            operation: "parsePDF",
            fileSource: "url",
            filePath: "{{Input.document.fileUrl}}"
        },
        depth: 2,
        dependencies: ["DetectType"],
        dependents: ["Analyze"]
    });

    // OCR branch for images
    nodes.set("OCRImage", {
        id: "OCRImage",
        type: "vision",
        name: "OCR Image",
        config: {
            provider: "openai",
            model: "gpt-4-vision-preview",
            prompt: "Extract all text from this image. Return the text exactly as it appears.",
            imageUrl: "{{Input.document.fileUrl}}"
        },
        depth: 2,
        dependencies: ["DetectType"],
        dependents: ["Analyze"]
    });

    // Word document parser
    nodes.set("ParseWord", {
        id: "ParseWord",
        type: "fileOperations",
        name: "Parse Word",
        config: {
            operation: "read",
            fileSource: "url",
            filePath: "{{Input.document.fileUrl}}"
        },
        depth: 2,
        dependencies: ["DetectType"],
        dependents: ["Analyze"]
    });

    // LLM Analysis
    nodes.set("Analyze", {
        id: "Analyze",
        type: "llm",
        name: "Analyze Content",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: `Analyze this document content and provide:
1. A brief summary (2-3 sentences)
2. Document classification (invoice, contract, report, correspondence, etc.)
3. Key entities (names, dates, amounts, etc.)
4. Key points
5. Any recommendations

Document content:
{{ParsePDF.content}}{{OCRImage.content}}{{ParseWord.content}}`
        },
        depth: 3,
        dependencies: ["ParsePDF", "OCRImage", "ParseWord"],
        dependents: ["StoreResults"]
    });

    // Store results in database
    nodes.set("StoreResults", {
        id: "StoreResults",
        type: "database",
        name: "Store Results",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "insert",
            parameters: {
                table: "processed_documents",
                data: {
                    document_id: "{{Input.document.documentId}}",
                    content: "{{ParsePDF.content}}{{OCRImage.content}}{{ParseWord.content}}",
                    analysis: "{{Analyze.content}}",
                    processed_at: "NOW()"
                }
            }
        },
        depth: 4,
        dependencies: ["Analyze"],
        dependents: ["SendNotification"]
    });

    // Send notification
    nodes.set("SendNotification", {
        id: "SendNotification",
        type: "http",
        name: "Send Notification",
        config: {
            method: "POST",
            url: "https://api.notifications.example.com/send",
            body: {
                type: "document_processed",
                documentId: "{{Input.document.documentId}}",
                summary: "{{Analyze.summary}}"
            }
        },
        depth: 5,
        dependencies: ["StoreResults"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 6,
        dependencies: ["SendNotification"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "DetectType"],
        ["DetectType", "ParsePDF", "case-pdf"],
        ["DetectType", "OCRImage", "case-image"],
        ["DetectType", "ParseWord", "case-docx"],
        ["ParsePDF", "Analyze"],
        ["OCRImage", "Analyze"],
        ["ParseWord", "Analyze"],
        ["Analyze", "StoreResults"],
        ["StoreResults", "SendNotification"],
        ["SendNotification", "Output"]
    ];

    for (const pair of edgePairs) {
        const [source, target, handleType] = pair;
        const edgeId = `${source}-${target}`;
        edges.set(edgeId, {
            id: edgeId,
            source,
            target,
            sourceHandle: handleType || "output",
            targetHandle: "input",
            handleType: (handleType || "default") as EdgeHandleType
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["DetectType"],
            ["ParsePDF", "OCRImage", "ParseWord"],
            ["Analyze"],
            ["StoreResults"],
            ["SendNotification"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

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

        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    { nodeId, nodeName: node.name, executionId: "test-execution" }
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
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    return {
        context,
        finalOutputs: buildFinalOutputs(context, workflow.outputNodeIds),
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Document Processing Workflow", () => {
    describe("PDF document processing", () => {
        it("should process PDF document through full pipeline", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        document: {
                            documentId: "doc-001",
                            fileUrl: "https://storage.example.com/doc.pdf",
                            fileType: "pdf"
                        }
                    },
                    DetectType: { selectedCase: "pdf", value: "pdf" },
                    ParsePDF: {
                        content: "Invoice #12345\nDate: 2024-01-15\nAmount: $1,500.00",
                        metadata: { pages: 1 }
                    },
                    OCRImage: { content: "" },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Invoice document for $1,500.00 dated January 15, 2024",
                        classification: "invoice",
                        entities: [
                            { type: "invoice_number", value: "12345", confidence: 0.95 },
                            { type: "amount", value: "$1,500.00", confidence: 0.98 },
                            { type: "date", value: "2024-01-15", confidence: 0.99 }
                        ],
                        keyPoints: ["Payment due in 30 days", "Tax included"]
                    },
                    StoreResults: { success: true, recordId: "rec-001" },
                    SendNotification: { success: true, notificationId: "notif-001" },
                    Output: { result: { status: "success", documentId: "doc-001" } }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                {
                    document: {
                        documentId: "doc-001",
                        fileUrl: "https://storage.example.com/doc.pdf",
                        fileType: "pdf"
                    }
                }
            );

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("DetectType");
            expect(executionOrder).toContain("Analyze");
            expect(executionOrder).toContain("StoreResults");
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should extract entities from multi-page PDF", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { document: { documentId: "doc-002", fileUrl: "url", fileType: "pdf" } },
                    DetectType: { selectedCase: "pdf" },
                    ParsePDF: {
                        content:
                            "Contract between Party A and Party B...\nEffective Date: 2024-03-01...",
                        metadata: { pages: 15 }
                    },
                    OCRImage: { content: "" },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Legal contract between two parties",
                        classification: "contract",
                        entities: [
                            { type: "party", value: "Party A", confidence: 0.9 },
                            { type: "party", value: "Party B", confidence: 0.9 },
                            { type: "date", value: "2024-03-01", confidence: 0.95 }
                        ]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { status: "success" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("image OCR processing", () => {
        it("should process image through OCR pipeline", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        document: {
                            documentId: "img-001",
                            fileUrl: "https://storage.example.com/receipt.jpg",
                            fileType: "image"
                        }
                    },
                    DetectType: { selectedCase: "image", value: "image" },
                    ParsePDF: { content: "" },
                    OCRImage: {
                        content:
                            "Store Name\nReceipt #: 789\nItems:\n- Widget $25.00\n- Gadget $15.00\nTotal: $40.00",
                        confidence: 0.92
                    },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Store receipt totaling $40.00",
                        classification: "receipt",
                        entities: [
                            { type: "receipt_number", value: "789", confidence: 0.88 },
                            { type: "amount", value: "$40.00", confidence: 0.95 }
                        ]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { status: "success" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("OCRImage");
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle low quality image with reduced confidence", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        document: { documentId: "img-002", fileUrl: "url", fileType: "image" }
                    },
                    DetectType: { selectedCase: "image" },
                    ParsePDF: { content: "" },
                    OCRImage: {
                        content: "Partial text... [illegible]... more text",
                        confidence: 0.45
                    },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Partially readable document",
                        classification: "unknown",
                        entities: [],
                        recommendations: ["Re-scan at higher resolution"]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { status: "partial", qualityWarning: true } }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs).toBeDefined();
        });
    });

    describe("Word document processing", () => {
        it("should process Word document", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        document: {
                            documentId: "word-001",
                            fileUrl: "https://storage.example.com/report.docx",
                            fileType: "docx"
                        }
                    },
                    DetectType: { selectedCase: "docx", value: "docx" },
                    ParsePDF: { content: "" },
                    OCRImage: { content: "" },
                    ParseWord: {
                        content: "Quarterly Report Q1 2024\n\nExecutive Summary...\nKey Metrics...",
                        metadata: { author: "John Doe" }
                    },
                    Analyze: {
                        summary: "Q1 2024 quarterly business report with key metrics",
                        classification: "report",
                        entities: [
                            { type: "period", value: "Q1 2024", confidence: 0.98 },
                            { type: "author", value: "John Doe", confidence: 0.9 }
                        ],
                        keyPoints: ["Revenue up 15%", "Customer growth 20%"]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { status: "success" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("ParseWord");
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should handle parse failure gracefully", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            document: { documentId: "doc-fail", fileUrl: "url", fileType: "pdf" }
                        }
                    },
                    DetectType: { customOutput: { selectedCase: "pdf" } },
                    ParsePDF: { shouldFail: true, errorMessage: "Corrupted PDF file" },
                    OCRImage: { customOutput: { content: "" } },
                    ParseWord: { customOutput: { content: "" } },
                    Analyze: { customOutput: { summary: "" } },
                    StoreResults: { customOutput: { success: false } },
                    SendNotification: { customOutput: { success: false } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("ParsePDF");
        });

        it("should handle LLM analysis timeout", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            document: { documentId: "doc-timeout", fileUrl: "url", fileType: "pdf" }
                        }
                    },
                    DetectType: { customOutput: { selectedCase: "pdf" } },
                    ParsePDF: { customOutput: { content: "Very long document content..." } },
                    OCRImage: { customOutput: { content: "" } },
                    ParseWord: { customOutput: { content: "" } },
                    Analyze: { shouldFail: true, errorMessage: "LLM request timeout after 30s" },
                    StoreResults: { customOutput: { success: false } },
                    SendNotification: { customOutput: { success: false } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("Analyze");
        });

        it("should handle database storage failure", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            document: { documentId: "doc-db-fail", fileUrl: "url", fileType: "pdf" }
                        }
                    },
                    DetectType: { customOutput: { selectedCase: "pdf" } },
                    ParsePDF: { customOutput: { content: "Document content" } },
                    OCRImage: { customOutput: { content: "" } },
                    ParseWord: { customOutput: { content: "" } },
                    Analyze: { customOutput: { summary: "Summary", classification: "invoice" } },
                    StoreResults: { shouldFail: true, errorMessage: "Database connection failed" },
                    SendNotification: { customOutput: { success: false } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("StoreResults");
        });
    });

    describe("document classification", () => {
        it("should correctly classify invoice document", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { document: { documentId: "inv-001", fileUrl: "url", fileType: "pdf" } },
                    DetectType: { selectedCase: "pdf" },
                    ParsePDF: {
                        content: "INVOICE\nInvoice Number: INV-2024-001\nBill To: Customer Corp"
                    },
                    OCRImage: { content: "" },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Invoice from vendor",
                        classification: "invoice",
                        entities: [
                            { type: "invoice_number", value: "INV-2024-001", confidence: 0.99 }
                        ]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { classification: "invoice" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });

        it("should correctly classify contract document", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { document: { documentId: "con-001", fileUrl: "url", fileType: "pdf" } },
                    DetectType: { selectedCase: "pdf" },
                    ParsePDF: {
                        content:
                            "SERVICE AGREEMENT\nThis Agreement is entered into by and between..."
                    },
                    OCRImage: { content: "" },
                    ParseWord: { content: "" },
                    Analyze: {
                        summary: "Service agreement contract",
                        classification: "contract",
                        entities: [
                            { type: "document_type", value: "Service Agreement", confidence: 0.97 }
                        ]
                    },
                    StoreResults: { success: true },
                    SendNotification: { success: true },
                    Output: { result: { classification: "contract" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("batch processing", () => {
        it("should process multiple documents in sequence", async () => {
            const workflow = createDocumentProcessingWorkflow();
            const documents = [
                { documentId: "batch-001", fileUrl: "url1", fileType: "pdf" as const },
                { documentId: "batch-002", fileUrl: "url2", fileType: "image" as const },
                { documentId: "batch-003", fileUrl: "url3", fileType: "docx" as const }
            ];

            const results: string[] = [];

            for (const doc of documents) {
                const mockActivities = createMockActivities(
                    withOutputs({
                        Input: { document: doc },
                        DetectType: { selectedCase: doc.fileType },
                        ParsePDF: { content: doc.fileType === "pdf" ? "PDF content" : "" },
                        OCRImage: { content: doc.fileType === "image" ? "Image text" : "" },
                        ParseWord: { content: doc.fileType === "docx" ? "Word content" : "" },
                        Analyze: {
                            summary: `Analysis of ${doc.documentId}`,
                            classification: "document"
                        },
                        StoreResults: { success: true },
                        SendNotification: { success: true },
                        Output: { result: { documentId: doc.documentId, status: "success" } }
                    })
                );

                const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities, {
                    document: doc
                });

                if (failedNodes.length === 0) {
                    results.push(doc.documentId);
                }
            }

            expect(results).toHaveLength(3);
            expect(results).toContain("batch-001");
            expect(results).toContain("batch-002");
            expect(results).toContain("batch-003");
        });
    });
});
