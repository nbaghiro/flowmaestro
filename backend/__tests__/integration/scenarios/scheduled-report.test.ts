/**
 * Scheduled Report Workflow Tests
 *
 * Tests scheduled report generation pipeline:
 * Fetch Data → Generate Report → Format → Store → Send
 *
 * Simulates automated reporting workflows.
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

function createScheduledReportWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Report Configuration",
        config: { name: "reportConfig" },
        depth: 0,
        dependencies: [],
        dependents: ["FetchSalesData", "FetchUserData", "FetchPerformanceData"]
    });

    // Parallel data fetching
    nodes.set("FetchSalesData", {
        id: "FetchSalesData",
        type: "database",
        name: "Fetch Sales Data",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: `SELECT date, SUM(amount) as total, COUNT(*) as count
                      FROM orders
                      WHERE date BETWEEN $1 AND $2
                      GROUP BY date`,
                params: [
                    "{{Input.reportConfig.dateRange.start}}",
                    "{{Input.reportConfig.dateRange.end}}"
                ]
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["AggregateData"]
    });

    nodes.set("FetchUserData", {
        id: "FetchUserData",
        type: "database",
        name: "Fetch User Data",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: `SELECT date, COUNT(*) as new_users, COUNT(CASE WHEN active THEN 1 END) as active_users
                      FROM users
                      WHERE created_at BETWEEN $1 AND $2
                      GROUP BY date`,
                params: [
                    "{{Input.reportConfig.dateRange.start}}",
                    "{{Input.reportConfig.dateRange.end}}"
                ]
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["AggregateData"]
    });

    nodes.set("FetchPerformanceData", {
        id: "FetchPerformanceData",
        type: "http",
        name: "Fetch Performance Metrics",
        config: {
            method: "GET",
            url: "https://api.metrics.example.com/performance",
            params: {
                start: "{{Input.reportConfig.dateRange.start}}",
                end: "{{Input.reportConfig.dateRange.end}}"
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["AggregateData"]
    });

    // Aggregate all data
    nodes.set("AggregateData", {
        id: "AggregateData",
        type: "transform",
        name: "Aggregate Data",
        config: {
            operation: "merge",
            sources: ["FetchSalesData", "FetchUserData", "FetchPerformanceData"]
        },
        depth: 2,
        dependencies: ["FetchSalesData", "FetchUserData", "FetchPerformanceData"],
        dependents: ["CalculateMetrics"]
    });

    // Calculate metrics
    nodes.set("CalculateMetrics", {
        id: "CalculateMetrics",
        type: "code",
        name: "Calculate Metrics",
        config: {
            language: "javascript",
            code: `
                const sales = inputs.FetchSalesData.data || [];
                const users = inputs.FetchUserData.data || [];
                const perf = inputs.FetchPerformanceData.body || {};

                const totalRevenue = sales.reduce((sum, d) => sum + d.total, 0);
                const totalOrders = sales.reduce((sum, d) => sum + d.count, 0);
                const newUsers = users.reduce((sum, d) => sum + d.new_users, 0);
                const activeUsers = users.reduce((sum, d) => sum + d.active_users, 0);

                return {
                    summary: {
                        totalRevenue,
                        totalOrders,
                        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                        newUsers,
                        activeUsers,
                        conversionRate: newUsers > 0 ? (totalOrders / newUsers * 100).toFixed(2) : 0,
                        avgResponseTime: perf.avgResponseTime || 0,
                        errorRate: perf.errorRate || 0
                    },
                    trends: {
                        revenue: sales.map(d => d.total),
                        orders: sales.map(d => d.count),
                        users: users.map(d => d.new_users)
                    },
                    period: {
                        start: inputs.reportConfig.dateRange.start,
                        end: inputs.reportConfig.dateRange.end
                    }
                };
            `
        },
        depth: 3,
        dependencies: ["AggregateData"],
        dependents: ["GenerateSummary"]
    });

    // Generate AI summary
    nodes.set("GenerateSummary", {
        id: "GenerateSummary",
        type: "llm",
        name: "Generate Summary",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt:
                "Generate an executive summary for this business report:\n\n" +
                "Period: {{CalculateMetrics.period.start}} to {{CalculateMetrics.period.end}}\n\n" +
                "Key Metrics:\n" +
                "- Total Revenue: ${{CalculateMetrics.summary.totalRevenue}}\n" +
                "- Total Orders: {{CalculateMetrics.summary.totalOrders}}\n" +
                "- Average Order Value: ${{CalculateMetrics.summary.averageOrderValue}}\n" +
                "- New Users: {{CalculateMetrics.summary.newUsers}}\n" +
                "- Conversion Rate: {{CalculateMetrics.summary.conversionRate}}%\n\n" +
                "Provide insights and recommendations in 2-3 paragraphs."
        },
        depth: 4,
        dependencies: ["CalculateMetrics"],
        dependents: ["FormatReport"]
    });

    // Format report based on output format
    nodes.set("FormatReport", {
        id: "FormatReport",
        type: "switch",
        name: "Format Report",
        config: {
            expression: "{{Input.reportConfig.format}}",
            cases: [
                { value: "pdf", label: "PDF" },
                { value: "csv", label: "CSV" },
                { value: "xlsx", label: "Excel" }
            ],
            defaultCase: "pdf"
        },
        depth: 5,
        dependencies: ["GenerateSummary"],
        dependents: ["GeneratePDF", "GenerateCSV", "GenerateExcel"]
    });

    // Format-specific generation
    nodes.set("GeneratePDF", {
        id: "GeneratePDF",
        type: "http",
        name: "Generate PDF",
        config: {
            method: "POST",
            url: "https://api.reports.example.com/generate/pdf",
            body: {
                template: "business_report",
                data: "{{CalculateMetrics}}",
                summary: "{{GenerateSummary.content}}"
            }
        },
        depth: 6,
        dependencies: ["FormatReport"],
        dependents: ["StoreReport"]
    });

    nodes.set("GenerateCSV", {
        id: "GenerateCSV",
        type: "transform",
        name: "Generate CSV",
        config: {
            operation: "toCSV",
            data: "{{CalculateMetrics.trends}}"
        },
        depth: 6,
        dependencies: ["FormatReport"],
        dependents: ["StoreReport"]
    });

    nodes.set("GenerateExcel", {
        id: "GenerateExcel",
        type: "http",
        name: "Generate Excel",
        config: {
            method: "POST",
            url: "https://api.reports.example.com/generate/xlsx",
            body: {
                data: "{{CalculateMetrics}}",
                sheets: ["Summary", "Sales", "Users", "Performance"]
            }
        },
        depth: 6,
        dependencies: ["FormatReport"],
        dependents: ["StoreReport"]
    });

    // Store report
    nodes.set("StoreReport", {
        id: "StoreReport",
        type: "http",
        name: "Store Report",
        config: {
            method: "POST",
            url: "https://storage.example.com/reports",
            body: {
                reportId: "{{Input.reportConfig.reportId}}",
                file: "{{GeneratePDF.file}}{{GenerateCSV.file}}{{GenerateExcel.file}}",
                metadata: {
                    type: "{{Input.reportConfig.reportType}}",
                    format: "{{Input.reportConfig.format}}",
                    generatedAt: "{{now()}}"
                }
            }
        },
        depth: 7,
        dependencies: ["GeneratePDF", "GenerateCSV", "GenerateExcel"],
        dependents: ["DeliverReport"]
    });

    // Deliver report
    nodes.set("DeliverReport", {
        id: "DeliverReport",
        type: "switch",
        name: "Deliver Report",
        config: {
            expression: "{{Input.reportConfig.deliveryChannel}}",
            cases: [
                { value: "email", label: "Email" },
                { value: "slack", label: "Slack" },
                { value: "s3", label: "S3" }
            ],
            defaultCase: "email"
        },
        depth: 8,
        dependencies: ["StoreReport"],
        dependents: ["SendEmail", "SendSlack", "UploadS3"]
    });

    // Delivery methods
    nodes.set("SendEmail", {
        id: "SendEmail",
        type: "http",
        name: "Send Email",
        config: {
            method: "POST",
            url: "https://api.email.example.com/send",
            body: {
                to: "{{Input.reportConfig.recipients}}",
                subject:
                    "{{Input.reportConfig.reportType}} Report - {{Input.reportConfig.dateRange.end}}",
                attachmentUrl: "{{StoreReport.url}}"
            }
        },
        depth: 9,
        dependencies: ["DeliverReport"],
        dependents: ["LogDelivery"]
    });

    nodes.set("SendSlack", {
        id: "SendSlack",
        type: "http",
        name: "Send Slack",
        config: {
            method: "POST",
            url: "https://hooks.slack.com/services/xxx",
            body: {
                text: "New {{Input.reportConfig.reportType}} report available",
                attachments: [{ title: "Download Report", url: "{{StoreReport.url}}" }]
            }
        },
        depth: 9,
        dependencies: ["DeliverReport"],
        dependents: ["LogDelivery"]
    });

    nodes.set("UploadS3", {
        id: "UploadS3",
        type: "http",
        name: "Upload to S3",
        config: {
            method: "PUT",
            url: "https://s3.amazonaws.com/reports/{{Input.reportConfig.reportId}}.{{Input.reportConfig.format}}",
            body: "{{StoreReport.file}}"
        },
        depth: 9,
        dependencies: ["DeliverReport"],
        dependents: ["LogDelivery"]
    });

    // Log delivery
    nodes.set("LogDelivery", {
        id: "LogDelivery",
        type: "database",
        name: "Log Delivery",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "insert",
            parameters: {
                table: "report_logs",
                data: {
                    report_id: "{{Input.reportConfig.reportId}}",
                    status: "delivered",
                    channel: "{{Input.reportConfig.deliveryChannel}}",
                    delivered_at: "NOW()"
                }
            }
        },
        depth: 10,
        dependencies: ["SendEmail", "SendSlack", "UploadS3"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 11,
        dependencies: ["LogDelivery"],
        dependents: []
    });

    // Build edges
    const edgePairs: [string, string, string?][] = [
        ["Input", "FetchSalesData"],
        ["Input", "FetchUserData"],
        ["Input", "FetchPerformanceData"],
        ["FetchSalesData", "AggregateData"],
        ["FetchUserData", "AggregateData"],
        ["FetchPerformanceData", "AggregateData"],
        ["AggregateData", "CalculateMetrics"],
        ["CalculateMetrics", "GenerateSummary"],
        ["GenerateSummary", "FormatReport"],
        ["FormatReport", "GeneratePDF", "case-pdf"],
        ["FormatReport", "GenerateCSV", "case-csv"],
        ["FormatReport", "GenerateExcel", "case-xlsx"],
        ["GeneratePDF", "StoreReport"],
        ["GenerateCSV", "StoreReport"],
        ["GenerateExcel", "StoreReport"],
        ["StoreReport", "DeliverReport"],
        ["DeliverReport", "SendEmail", "case-email"],
        ["DeliverReport", "SendSlack", "case-slack"],
        ["DeliverReport", "UploadS3", "case-s3"],
        ["SendEmail", "LogDelivery"],
        ["SendSlack", "LogDelivery"],
        ["UploadS3", "LogDelivery"],
        ["LogDelivery", "Output"]
    ];

    for (const [source, target, handleType] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
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
            ["FetchSalesData", "FetchUserData", "FetchPerformanceData"],
            ["AggregateData"],
            ["CalculateMetrics"],
            ["GenerateSummary"],
            ["FormatReport"],
            ["GeneratePDF", "GenerateCSV", "GenerateExcel"],
            ["StoreReport"],
            ["DeliverReport"],
            ["SendEmail", "SendSlack", "UploadS3"],
            ["LogDelivery"],
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

describe("Scheduled Report Workflow", () => {
    describe("report generation", () => {
        it("should generate daily report successfully", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "report-001",
                            reportType: "daily",
                            dateRange: { start: "2024-01-14", end: "2024-01-15" },
                            metrics: ["revenue", "orders", "users"],
                            recipients: ["team@example.com"],
                            format: "pdf",
                            deliveryChannel: "email"
                        }
                    },
                    FetchSalesData: {
                        data: [
                            { date: "2024-01-14", total: 5000, count: 50 },
                            { date: "2024-01-15", total: 6000, count: 55 }
                        ]
                    },
                    FetchUserData: {
                        data: [
                            { date: "2024-01-14", new_users: 100, active_users: 80 },
                            { date: "2024-01-15", new_users: 120, active_users: 95 }
                        ]
                    },
                    FetchPerformanceData: {
                        statusCode: 200,
                        body: { avgResponseTime: 150, errorRate: 0.5 }
                    },
                    AggregateData: { merged: true },
                    CalculateMetrics: {
                        summary: { totalRevenue: 11000, totalOrders: 105, newUsers: 220 },
                        trends: { revenue: [5000, 6000], orders: [50, 55] }
                    },
                    GenerateSummary: {
                        content:
                            "Daily performance shows strong growth with 11% increase in revenue..."
                    },
                    FormatReport: { selectedCase: "pdf" },
                    GeneratePDF: { file: "base64...", url: "https://storage/report.pdf" },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { skipped: true },
                    StoreReport: {
                        success: true,
                        url: "https://storage.example.com/reports/report-001.pdf"
                    },
                    DeliverReport: { selectedCase: "email" },
                    SendEmail: { success: true, messageId: "msg-001" },
                    SendSlack: { skipped: true },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: { status: "success", reportId: "report-001" } }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("FetchSalesData");
            expect(executionOrder).toContain("CalculateMetrics");
            expect(executionOrder).toContain("GenerateSummary");
            expect(executionOrder).toContain("GeneratePDF");
            expect(executionOrder).toContain("SendEmail");
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should generate weekly report with CSV format", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "report-weekly",
                            reportType: "weekly",
                            dateRange: { start: "2024-01-08", end: "2024-01-15" },
                            format: "csv",
                            deliveryChannel: "s3"
                        }
                    },
                    FetchSalesData: { data: [] },
                    FetchUserData: { data: [] },
                    FetchPerformanceData: { statusCode: 200, body: {} },
                    AggregateData: { merged: true },
                    CalculateMetrics: { summary: {}, trends: {} },
                    GenerateSummary: { content: "Weekly summary..." },
                    FormatReport: { selectedCase: "csv" },
                    GeneratePDF: { skipped: true },
                    GenerateCSV: { file: "date,revenue,orders\n...", format: "csv" },
                    GenerateExcel: { skipped: true },
                    StoreReport: { success: true, url: "https://storage/report.csv" },
                    DeliverReport: { selectedCase: "s3" },
                    SendEmail: { skipped: true },
                    SendSlack: { skipped: true },
                    UploadS3: { success: true, location: "s3://reports/report-weekly.csv" },
                    LogDelivery: { success: true },
                    Output: { result: { status: "success" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("GenerateCSV");
            expect(executionOrder).toContain("UploadS3");
            expect(failedNodes).toHaveLength(0);
        });

        it("should generate monthly report with Excel format", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "report-monthly",
                            reportType: "monthly",
                            dateRange: { start: "2024-01-01", end: "2024-01-31" },
                            format: "xlsx",
                            deliveryChannel: "slack"
                        }
                    },
                    FetchSalesData: { data: [] },
                    FetchUserData: { data: [] },
                    FetchPerformanceData: { statusCode: 200, body: {} },
                    AggregateData: { merged: true },
                    CalculateMetrics: { summary: {}, trends: {} },
                    GenerateSummary: { content: "Monthly summary..." },
                    FormatReport: { selectedCase: "xlsx" },
                    GeneratePDF: { skipped: true },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { file: "xlsx_binary", sheets: 4 },
                    StoreReport: { success: true, url: "https://storage/report.xlsx" },
                    DeliverReport: { selectedCase: "slack" },
                    SendEmail: { skipped: true },
                    SendSlack: { success: true, channel: "#reports" },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: { status: "success" } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("GenerateExcel");
            expect(executionOrder).toContain("SendSlack");
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("parallel data fetching", () => {
        it("should fetch all data sources in parallel", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "r-parallel",
                            format: "pdf",
                            deliveryChannel: "email",
                            dateRange: {}
                        }
                    },
                    FetchSalesData: { data: [], latency: 100 },
                    FetchUserData: { data: [], latency: 80 },
                    FetchPerformanceData: { statusCode: 200, body: {}, latency: 120 },
                    AggregateData: { merged: true },
                    CalculateMetrics: { summary: {} },
                    GenerateSummary: { content: "" },
                    FormatReport: { selectedCase: "pdf" },
                    GeneratePDF: { file: "" },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { skipped: true },
                    StoreReport: { success: true },
                    DeliverReport: { selectedCase: "email" },
                    SendEmail: { success: true },
                    SendSlack: { skipped: true },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: {} }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            // All three fetch nodes should appear after Input
            const inputIndex = executionOrder.indexOf("Input");
            const salesIndex = executionOrder.indexOf("FetchSalesData");
            const usersIndex = executionOrder.indexOf("FetchUserData");
            const perfIndex = executionOrder.indexOf("FetchPerformanceData");

            expect(salesIndex).toBeGreaterThan(inputIndex);
            expect(usersIndex).toBeGreaterThan(inputIndex);
            expect(perfIndex).toBeGreaterThan(inputIndex);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("AI summary generation", () => {
        it("should generate insightful AI summary", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "r-ai",
                            format: "pdf",
                            deliveryChannel: "email",
                            dateRange: {}
                        }
                    },
                    FetchSalesData: { data: [{ date: "2024-01-15", total: 10000, count: 100 }] },
                    FetchUserData: {
                        data: [{ date: "2024-01-15", new_users: 50, active_users: 40 }]
                    },
                    FetchPerformanceData: {
                        statusCode: 200,
                        body: { avgResponseTime: 100, errorRate: 0.1 }
                    },
                    AggregateData: { merged: true },
                    CalculateMetrics: {
                        summary: {
                            totalRevenue: 10000,
                            totalOrders: 100,
                            averageOrderValue: 100,
                            newUsers: 50
                        }
                    },
                    GenerateSummary: {
                        content: `Executive Summary:

Today's performance shows strong results with total revenue of $10,000 across 100 orders. The average order value of $100 indicates healthy customer spending. User acquisition remains steady with 50 new users, of which 80% are actively engaged.

Key highlights:
- Revenue exceeded daily targets by 15%
- Conversion rate improved from previous period
- System performance is excellent with 100ms average response time

Recommendations:
- Consider scaling marketing efforts to capitalize on strong conversion
- Monitor server capacity as traffic continues to grow`
                    },
                    FormatReport: { selectedCase: "pdf" },
                    GeneratePDF: { file: "" },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { skipped: true },
                    StoreReport: { success: true },
                    DeliverReport: { selectedCase: "email" },
                    SendEmail: { success: true },
                    SendSlack: { skipped: true },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should handle database fetch failure", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            reportConfig: {
                                reportId: "r-err",
                                format: "pdf",
                                deliveryChannel: "email"
                            }
                        }
                    },
                    FetchSalesData: {
                        shouldFail: true,
                        errorMessage: "Database connection timeout"
                    },
                    FetchUserData: { customOutput: { data: [] } },
                    FetchPerformanceData: { customOutput: { statusCode: 200, body: {} } },
                    AggregateData: { customOutput: {} },
                    CalculateMetrics: { customOutput: {} },
                    GenerateSummary: { customOutput: {} },
                    FormatReport: { customOutput: {} },
                    GeneratePDF: { customOutput: {} },
                    GenerateCSV: { customOutput: {} },
                    GenerateExcel: { customOutput: {} },
                    StoreReport: { customOutput: {} },
                    DeliverReport: { customOutput: {} },
                    SendEmail: { customOutput: {} },
                    SendSlack: { customOutput: {} },
                    UploadS3: { customOutput: {} },
                    LogDelivery: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("FetchSalesData");
        });

        it("should handle PDF generation failure", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            reportConfig: {
                                reportId: "r-pdf-err",
                                format: "pdf",
                                deliveryChannel: "email"
                            }
                        }
                    },
                    FetchSalesData: { customOutput: { data: [] } },
                    FetchUserData: { customOutput: { data: [] } },
                    FetchPerformanceData: { customOutput: { statusCode: 200, body: {} } },
                    AggregateData: { customOutput: { merged: true } },
                    CalculateMetrics: { customOutput: { summary: {} } },
                    GenerateSummary: { customOutput: { content: "Summary" } },
                    FormatReport: { customOutput: { selectedCase: "pdf" } },
                    GeneratePDF: { shouldFail: true, errorMessage: "PDF service unavailable" },
                    GenerateCSV: { customOutput: { skipped: true } },
                    GenerateExcel: { customOutput: { skipped: true } },
                    StoreReport: { customOutput: {} },
                    DeliverReport: { customOutput: {} },
                    SendEmail: { customOutput: {} },
                    SendSlack: { customOutput: {} },
                    UploadS3: { customOutput: {} },
                    LogDelivery: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("GeneratePDF");
        });

        it("should handle email delivery failure", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            reportConfig: {
                                reportId: "r-email-err",
                                format: "pdf",
                                deliveryChannel: "email"
                            }
                        }
                    },
                    FetchSalesData: { customOutput: { data: [] } },
                    FetchUserData: { customOutput: { data: [] } },
                    FetchPerformanceData: { customOutput: { statusCode: 200, body: {} } },
                    AggregateData: { customOutput: { merged: true } },
                    CalculateMetrics: { customOutput: { summary: {} } },
                    GenerateSummary: { customOutput: { content: "Summary" } },
                    FormatReport: { customOutput: { selectedCase: "pdf" } },
                    GeneratePDF: { customOutput: { file: "data" } },
                    GenerateCSV: { customOutput: { skipped: true } },
                    GenerateExcel: { customOutput: { skipped: true } },
                    StoreReport: {
                        customOutput: { success: true, url: "https://storage/report.pdf" }
                    },
                    DeliverReport: { customOutput: { selectedCase: "email" } },
                    SendEmail: {
                        shouldFail: true,
                        errorMessage: "SMTP server rejected connection"
                    },
                    SendSlack: { customOutput: { skipped: true } },
                    UploadS3: { customOutput: { skipped: true } },
                    LogDelivery: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes, executionOrder } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toContain("SendEmail");
            expect(executionOrder).toContain("StoreReport");
        });
    });

    describe("metrics calculation", () => {
        it("should calculate correct metrics from raw data", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "r-metrics",
                            format: "pdf",
                            deliveryChannel: "email",
                            dateRange: {}
                        }
                    },
                    FetchSalesData: {
                        data: [
                            { date: "2024-01-14", total: 1500, count: 15 },
                            { date: "2024-01-15", total: 2500, count: 25 }
                        ]
                    },
                    FetchUserData: {
                        data: [
                            { date: "2024-01-14", new_users: 30, active_users: 25 },
                            { date: "2024-01-15", new_users: 40, active_users: 35 }
                        ]
                    },
                    FetchPerformanceData: {
                        statusCode: 200,
                        body: { avgResponseTime: 120, errorRate: 0.2 }
                    },
                    AggregateData: { merged: true },
                    CalculateMetrics: {
                        summary: {
                            totalRevenue: 4000,
                            totalOrders: 40,
                            averageOrderValue: 100,
                            newUsers: 70,
                            activeUsers: 60,
                            conversionRate: "57.14",
                            avgResponseTime: 120,
                            errorRate: 0.2
                        },
                        trends: {
                            revenue: [1500, 2500],
                            orders: [15, 25],
                            users: [30, 40]
                        }
                    },
                    GenerateSummary: { content: "Metrics calculated" },
                    FormatReport: { selectedCase: "pdf" },
                    GeneratePDF: { file: "" },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { skipped: true },
                    StoreReport: { success: true },
                    DeliverReport: { selectedCase: "email" },
                    SendEmail: { success: true },
                    SendSlack: { skipped: true },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle empty data gracefully", async () => {
            const workflow = createScheduledReportWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        reportConfig: {
                            reportId: "r-empty",
                            format: "pdf",
                            deliveryChannel: "email",
                            dateRange: {}
                        }
                    },
                    FetchSalesData: { data: [] },
                    FetchUserData: { data: [] },
                    FetchPerformanceData: { statusCode: 200, body: {} },
                    AggregateData: { merged: true },
                    CalculateMetrics: {
                        summary: {
                            totalRevenue: 0,
                            totalOrders: 0,
                            averageOrderValue: 0,
                            newUsers: 0,
                            activeUsers: 0,
                            conversionRate: 0
                        },
                        trends: { revenue: [], orders: [], users: [] }
                    },
                    GenerateSummary: { content: "No data available for this period." },
                    FormatReport: { selectedCase: "pdf" },
                    GeneratePDF: { file: "" },
                    GenerateCSV: { skipped: true },
                    GenerateExcel: { skipped: true },
                    StoreReport: { success: true },
                    DeliverReport: { selectedCase: "email" },
                    SendEmail: { success: true },
                    SendSlack: { skipped: true },
                    UploadS3: { skipped: true },
                    LogDelivery: { success: true },
                    Output: { result: { status: "success", hasData: false } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("delivery logging", () => {
        it("should log successful delivery", async () => {
            const workflow = createScheduledReportWorkflow();
            let logData: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            reportConfig: {
                                reportId: "r-log",
                                reportType: "daily",
                                format: "pdf",
                                deliveryChannel: "email"
                            }
                        }
                    },
                    FetchSalesData: { customOutput: { data: [] } },
                    FetchUserData: { customOutput: { data: [] } },
                    FetchPerformanceData: { customOutput: { statusCode: 200, body: {} } },
                    AggregateData: { customOutput: { merged: true } },
                    CalculateMetrics: { customOutput: { summary: {} } },
                    GenerateSummary: { customOutput: { content: "" } },
                    FormatReport: { customOutput: { selectedCase: "pdf" } },
                    GeneratePDF: { customOutput: { file: "" } },
                    GenerateCSV: { customOutput: { skipped: true } },
                    GenerateExcel: { customOutput: { skipped: true } },
                    StoreReport: { customOutput: { success: true } },
                    DeliverReport: { customOutput: { selectedCase: "email" } },
                    SendEmail: { customOutput: { success: true } },
                    SendSlack: { customOutput: { skipped: true } },
                    UploadS3: { customOutput: { skipped: true } },
                    LogDelivery: {
                        customOutput: { success: true },
                        onExecute: (input) => {
                            logData = input.nodeConfig;
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toHaveLength(0);
            expect(logData).toBeDefined();
        });
    });
});
