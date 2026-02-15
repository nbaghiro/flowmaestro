/**
 * Document Generation Pattern Integration Tests
 *
 * True integration tests that verify document generation behavior through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - PDF extraction from documents
 * - PDF generation from markdown/HTML
 * - Spreadsheet generation (Excel/CSV)
 * - Chart generation
 * - Template rendering
 * - Chained document workflows
 * - Error handling scenarios
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject, JsonValue } from "@flowmaestro/shared";

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
 * Create a PDF extraction workflow
 * Input -> PdfExtract -> Output
 */
function createPdfExtractDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["extract"] = {
        type: "pdfExtract",
        name: "Extract PDF",
        config: {
            path: "${input.data.pdfPath}",
            extractText: true,
            extractMetadata: true,
            outputFormat: "text",
            outputVariable: "pdfContent"
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
        { id: "input-extract", source: "input", target: "extract" },
        { id: "extract-output", source: "extract", target: "output" }
    );

    return {
        name: "PDF Extract Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a PDF generation workflow
 * Input -> PdfGeneration -> Output
 */
function createPdfGenerationDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["generate"] = {
        type: "pdfGeneration",
        name: "Generate PDF",
        config: {
            content: "${input.data.content}",
            format: "markdown",
            filename: "${input.data.filename}",
            pageSize: "letter",
            orientation: "portrait",
            marginTop: "1in",
            marginRight: "1in",
            marginBottom: "1in",
            marginLeft: "1in",
            includePageNumbers: true,
            outputVariable: "generatedPdf"
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
        name: "PDF Generation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a spreadsheet generation workflow
 * Input -> SpreadsheetGeneration -> Output
 */
function createSpreadsheetDefinition(format: "xlsx" | "csv" = "xlsx"): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["spreadsheet"] = {
        type: "spreadsheetGeneration",
        name: "Generate Spreadsheet",
        config: {
            dataSource: "${input.data.records}",
            format,
            filename: "${input.data.filename}",
            sheetName: "Data",
            headerBold: true,
            headerBackgroundColor: "#4472C4",
            headerFontColor: "#FFFFFF",
            alternateRows: true,
            freezeHeader: true,
            outputVariable: "spreadsheet"
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
        { id: "input-spreadsheet", source: "input", target: "spreadsheet" },
        { id: "spreadsheet-output", source: "spreadsheet", target: "output" }
    );

    return {
        name: `Spreadsheet ${format.toUpperCase()} Workflow`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a chart generation workflow
 * Input -> ChartGeneration -> Output
 */
function createChartDefinition(chartType: string = "bar"): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["chart"] = {
        type: "chartGeneration",
        name: "Generate Chart",
        config: {
            chartType,
            dataSource: "${input.data.datasets}",
            dataLabels: "${input.data.labels}",
            title: "${input.data.title}",
            xAxisLabel: "Category",
            yAxisLabel: "Value",
            width: 800,
            height: 600,
            theme: "default",
            legend: true,
            showGrid: true,
            showValues: true,
            outputVariable: "chart"
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
        { id: "input-chart", source: "input", target: "chart" },
        { id: "chart-output", source: "chart", target: "output" }
    );

    return {
        name: `${chartType} Chart Workflow`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a template rendering workflow
 * Input -> TemplateOutput -> Output
 */
function createTemplateDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["template"] = {
        type: "templateOutput",
        name: "Render Template",
        config: {
            template:
                "# Hello, ${input.data.name}!\n\nYour order **#${input.data.orderId}** has been confirmed.\n\n## Items\n${input.data.items}",
            outputFormat: "html",
            outputName: "renderedContent"
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
        { id: "input-template", source: "input", target: "template" },
        { id: "template-output", source: "template", target: "output" }
    );

    return {
        name: "Template Rendering Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a report generation workflow
 * Input -> Template -> PDF -> Output
 */
function createReportGenerationDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["template"] = {
        type: "templateOutput",
        name: "Generate Report Content",
        config: {
            template:
                "# ${input.data.reportTitle}\n\n**Generated:** ${input.data.date}\n\n## Summary\n${input.data.summary}\n\n## Details\n${input.data.details}",
            outputFormat: "markdown",
            outputName: "reportMarkdown"
        },
        position: { x: 200, y: 0 }
    };

    nodes["pdf"] = {
        type: "pdfGeneration",
        name: "Convert to PDF",
        config: {
            content: "${template.reportMarkdown}",
            format: "markdown",
            filename: "${input.data.filename}",
            pageSize: "letter",
            orientation: "portrait",
            headerText: "${input.data.reportTitle}",
            footerText: "Confidential",
            includePageNumbers: true,
            outputVariable: "reportPdf"
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
        { id: "input-template", source: "input", target: "template" },
        { id: "template-pdf", source: "template", target: "pdf" },
        { id: "pdf-output", source: "pdf", target: "output" }
    );

    return {
        name: "Report Generation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a data visualization workflow
 * Input -> Transform (process data) -> Chart -> Spreadsheet -> Output
 */
function createDataVisualizationDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Process Data",
        config: {
            operation: "custom",
            inputData: "${input.data.rawData}",
            expression:
                "{ labels: $.map(d => d.month), datasets: [{ label: 'Sales', data: $.map(d => d.sales) }] }",
            outputVariable: "processedData"
        },
        position: { x: 200, y: 0 }
    };

    nodes["chart"] = {
        type: "chartGeneration",
        name: "Generate Chart",
        config: {
            chartType: "line",
            dataSource: "${transform.processedData.datasets}",
            dataLabels: "${transform.processedData.labels}",
            title: "Monthly Sales",
            xAxisLabel: "Month",
            yAxisLabel: "Sales ($)",
            width: 800,
            height: 400,
            theme: "default",
            outputVariable: "salesChart"
        },
        position: { x: 400, y: -50 }
    };

    nodes["spreadsheet"] = {
        type: "spreadsheetGeneration",
        name: "Export Data",
        config: {
            dataSource: "${input.data.rawData}",
            format: "xlsx",
            filename: "sales_data.xlsx",
            sheetName: "Monthly Sales",
            headerBold: true,
            outputVariable: "dataExport"
        },
        position: { x: 400, y: 50 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-transform", source: "input", target: "transform" },
        { id: "transform-chart", source: "transform", target: "chart" },
        { id: "transform-spreadsheet", source: "transform", target: "spreadsheet" },
        { id: "chart-output", source: "chart", target: "output" },
        { id: "spreadsheet-output", source: "spreadsheet", target: "output" }
    );

    return {
        name: "Data Visualization Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a PDF processing workflow
 * Input -> PdfExtract -> Transform -> PdfGeneration -> Output
 */
function createPdfProcessingDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["extract"] = {
        type: "pdfExtract",
        name: "Extract Source PDF",
        config: {
            path: "${input.data.sourcePdf}",
            extractText: true,
            extractMetadata: true,
            outputFormat: "text",
            outputVariable: "extractedContent"
        },
        position: { x: 200, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Format Content",
        config: {
            operation: "custom",
            inputData: "${extract.extractedContent}",
            expression:
                "{ formatted: '# Processed Document\\n\\n' + $.text.substring(0, 1000) + '\\n\\n## Metadata\\n- Pages: ' + $.metadata.pageCount + '\\n- Words: ' + $.wordCount }",
            outputVariable: "formattedContent"
        },
        position: { x: 400, y: 0 }
    };

    nodes["generate"] = {
        type: "pdfGeneration",
        name: "Generate New PDF",
        config: {
            content: "${transform.formattedContent.formatted}",
            format: "markdown",
            filename: "${input.data.outputFilename}",
            pageSize: "letter",
            orientation: "portrait",
            outputVariable: "newPdf"
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
        { id: "input-extract", source: "input", target: "extract" },
        { id: "extract-transform", source: "extract", target: "transform" },
        { id: "transform-generate", source: "transform", target: "generate" },
        { id: "generate-output", source: "generate", target: "output" }
    );

    return {
        name: "PDF Processing Workflow",
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

    // Default successful mock implementations
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

        const signals: Record<string, JsonValue> = {};

        return {
            result: output,
            signals,
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Document Generation Pattern Integration Tests", () => {
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

    describe("PDF extraction", () => {
        it("should extract text from PDF", async () => {
            const workflowDef = createPdfExtractDefinition();

            configureMockNodeOutputs({
                extract: {
                    text: "This is the extracted text from the PDF document.",
                    pages: [{ pageNumber: 1, text: "This is page 1 content." }],
                    metadata: {
                        title: "Test Document",
                        author: "Test Author",
                        pageCount: 5,
                        isEncrypted: false
                    },
                    wordCount: 150,
                    characterCount: 850
                },
                output: { result: { extracted: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-extract-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-extract",
                            workflowDefinition: workflowDef,
                            inputs: { data: { pdfPath: "/path/to/document.pdf" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("extract");
        });

        it("should extract metadata from PDF", async () => {
            const workflowDef = createPdfExtractDefinition();

            configureMockNodeOutputs({
                extract: {
                    text: "",
                    pages: [],
                    metadata: {
                        title: "Annual Report 2024",
                        author: "Finance Team",
                        subject: "Financial Results",
                        creator: "Microsoft Word",
                        pageCount: 42,
                        isEncrypted: false,
                        creationDate: "2024-01-15",
                        modificationDate: "2024-02-01"
                    },
                    wordCount: 0,
                    characterCount: 0
                },
                output: { result: { metadataOnly: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-metadata-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-metadata",
                            workflowDefinition: workflowDef,
                            inputs: { data: { pdfPath: "/path/to/report.pdf" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("PDF generation", () => {
        it("should generate PDF from markdown", async () => {
            const workflowDef = createPdfGenerationDefinition();

            configureMockNodeOutputs({
                generate: {
                    path: "/output/generated.pdf",
                    filename: "report.pdf",
                    size: 25600,
                    pageCount: 3
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-generate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-generate",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    content: "# Report Title\n\nThis is the report content.",
                                    filename: "report.pdf"
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

        it("should generate PDF with headers and footers", async () => {
            const workflowDef = createPdfGenerationDefinition();

            configureMockNodeOutputs({
                generate: {
                    path: "/output/formal.pdf",
                    filename: "formal_report.pdf",
                    size: 45000,
                    pageCount: 10
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-headers-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-headers",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    content: "# Formal Report\n\nMultiple pages of content...",
                                    filename: "formal_report.pdf"
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

    describe("spreadsheet generation", () => {
        it("should generate Excel spreadsheet", async () => {
            const workflowDef = createSpreadsheetDefinition("xlsx");

            configureMockNodeOutputs({
                spreadsheet: {
                    path: "/output/data.xlsx",
                    filename: "data.xlsx",
                    format: "xlsx",
                    size: 15000,
                    sheetCount: 1,
                    rowCount: 100
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-xlsx-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-xlsx",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    records: [
                                        { name: "Item 1", quantity: 10, price: 25.5 },
                                        { name: "Item 2", quantity: 5, price: 15.0 }
                                    ],
                                    filename: "data.xlsx"
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
            expect(nodeIds).toContain("spreadsheet");
        });

        it("should generate CSV file", async () => {
            const workflowDef = createSpreadsheetDefinition("csv");

            configureMockNodeOutputs({
                spreadsheet: {
                    path: "/output/export.csv",
                    filename: "export.csv",
                    format: "csv",
                    size: 2500,
                    sheetCount: 1,
                    rowCount: 50
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-csv-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-csv",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    records: [{ id: 1, value: "test" }],
                                    filename: "export.csv"
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

    describe("chart generation", () => {
        it("should generate bar chart", async () => {
            const workflowDef = createChartDefinition("bar");

            configureMockNodeOutputs({
                chart: {
                    path: "/output/chart.png",
                    filename: "sales_chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 45000,
                    chartType: "bar"
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-bar-chart-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-bar-chart",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    datasets: [{ label: "Sales", data: [100, 150, 200, 175] }],
                                    labels: ["Q1", "Q2", "Q3", "Q4"],
                                    title: "Quarterly Sales"
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
            expect(nodeIds).toContain("chart");
        });

        it("should generate line chart", async () => {
            const workflowDef = createChartDefinition("line");

            configureMockNodeOutputs({
                chart: {
                    path: "/output/trend.png",
                    filename: "trend.png",
                    format: "png",
                    width: 800,
                    height: 400,
                    size: 35000,
                    chartType: "line"
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-line-chart-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-line-chart",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    datasets: [
                                        { label: "Revenue", data: [1000, 1200, 1100, 1400, 1350] }
                                    ],
                                    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
                                    title: "Revenue Trend"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should generate pie chart", async () => {
            const workflowDef = createChartDefinition("pie");

            configureMockNodeOutputs({
                chart: {
                    path: "/output/distribution.png",
                    filename: "distribution.png",
                    format: "png",
                    width: 600,
                    height: 600,
                    size: 28000,
                    chartType: "pie"
                },
                output: { result: { generated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pie-chart-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pie-chart",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    datasets: [{ label: "Market Share", data: [45, 30, 15, 10] }],
                                    labels: ["Product A", "Product B", "Product C", "Others"],
                                    title: "Market Distribution"
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

    describe("template rendering", () => {
        it("should render markdown template to HTML", async () => {
            const workflowDef = createTemplateDefinition();

            configureMockNodeOutputs({
                template: {
                    renderedContent:
                        "<h1>Hello, John!</h1><p>Your order <strong>#12345</strong> has been confirmed.</p>"
                },
                output: { result: { rendered: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-template-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-template",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    name: "John",
                                    orderId: "12345",
                                    items: "- Widget x2\n- Gadget x1"
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
            expect(nodeIds).toContain("template");
        });
    });

    describe("chained document workflows", () => {
        it("should generate full report (template -> PDF)", async () => {
            const workflowDef = createReportGenerationDefinition();

            configureMockNodeOutputs({
                template: {
                    reportMarkdown:
                        "# Q4 Report\n\n**Generated:** 2024-01-15\n\n## Summary\nStrong performance."
                },
                pdf: {
                    path: "/output/q4_report.pdf",
                    filename: "q4_report.pdf",
                    size: 65000,
                    pageCount: 8
                },
                output: { result: { reportGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-report-gen-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-report-gen",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    reportTitle: "Q4 Report",
                                    date: "2024-01-15",
                                    summary: "Strong performance across all metrics.",
                                    details: "Detailed analysis follows...",
                                    filename: "q4_report.pdf"
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
            expect(nodeIds).toContain("template");
            expect(nodeIds).toContain("pdf");
        });

        it("should create data visualization package (transform -> chart + spreadsheet)", async () => {
            const workflowDef = createDataVisualizationDefinition();

            configureMockNodeOutputs({
                transform: {
                    labels: ["Jan", "Feb", "Mar"],
                    datasets: [{ label: "Sales", data: [100, 150, 120] }]
                },
                chart: {
                    path: "/output/sales_chart.png",
                    filename: "sales_chart.png",
                    format: "png",
                    size: 35000,
                    chartType: "line"
                },
                spreadsheet: {
                    path: "/output/sales_data.xlsx",
                    filename: "sales_data.xlsx",
                    format: "xlsx",
                    size: 12000,
                    rowCount: 3
                },
                output: { result: { visualized: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-data-viz-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-data-viz",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    rawData: [
                                        { month: "Jan", sales: 100 },
                                        { month: "Feb", sales: 150 },
                                        { month: "Mar", sales: 120 }
                                    ]
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
            expect(nodeIds).toContain("transform");
            expect(nodeIds).toContain("chart");
            expect(nodeIds).toContain("spreadsheet");
        });

        it("should process PDF (extract -> transform -> generate)", async () => {
            const workflowDef = createPdfProcessingDefinition();

            configureMockNodeOutputs({
                extract: {
                    text: "Original document content that needs to be processed...",
                    metadata: { pageCount: 10, isEncrypted: false },
                    wordCount: 500
                },
                transform: {
                    formatted:
                        "# Processed Document\n\nOriginal document content...\n\n## Metadata\n- Pages: 10\n- Words: 500"
                },
                generate: {
                    path: "/output/processed.pdf",
                    filename: "processed.pdf",
                    size: 28000,
                    pageCount: 2
                },
                output: { result: { processed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-process-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-process",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    sourcePdf: "/input/original.pdf",
                                    outputFilename: "processed.pdf"
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
            expect(nodeIds).toContain("extract");
            expect(nodeIds).toContain("transform");
            expect(nodeIds).toContain("generate");
        });
    });

    describe("error handling", () => {
        it("should handle PDF extraction failure", async () => {
            const workflowDef = createPdfExtractDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "extract") {
                    throw new Error("PDF is encrypted and no password provided");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pdf-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pdf-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { pdfPath: "/path/to/encrypted.pdf" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle chart generation failure", async () => {
            const workflowDef = createChartDefinition("bar");

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "chart") {
                    throw new Error("Invalid data format for chart generation");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chart-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chart-error",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    datasets: "invalid",
                                    labels: null,
                                    title: "Test"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should generate invoice document", async () => {
            const workflowDef = createPdfGenerationDefinition();

            configureMockNodeOutputs({
                generate: {
                    path: "/output/invoice.pdf",
                    filename: "INV-2024-001.pdf",
                    size: 32000,
                    pageCount: 1
                },
                output: { result: { invoiceGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-invoice-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-invoice",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    content:
                                        "# Invoice #INV-2024-001\n\nBill To: Acme Corp\n\nWidget x10 @ $50",
                                    filename: "INV-2024-001.pdf"
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
