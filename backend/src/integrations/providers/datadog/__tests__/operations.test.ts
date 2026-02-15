/**
 * Datadog Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateEvent, createEventSchema } from "../operations/createEvent";
import { executeCreateIncident, createIncidentSchema } from "../operations/createIncident";
import { executeCreateMonitor, createMonitorSchema } from "../operations/createMonitor";
import { executeGetMonitor, getMonitorSchema } from "../operations/getMonitor";
import { executeListEvents, listEventsSchema } from "../operations/listEvents";
import { executeListIncidents, listIncidentsSchema } from "../operations/listIncidents";
import { executeListMonitors, listMonitorsSchema } from "../operations/listMonitors";
import { executeMuteMonitor, muteMonitorSchema } from "../operations/muteMonitor";
import { executeQueryMetrics, queryMetricsSchema } from "../operations/queryMetrics";
import { executeSubmitMetrics, submitMetricsSchema } from "../operations/submitMetrics";
import type { DatadogClient } from "../client/DatadogClient";

// Mock DatadogClient factory
function createMockDatadogClient(): jest.Mocked<DatadogClient> {
    return {
        queryMetrics: jest.fn(),
        submitMetrics: jest.fn(),
        listMonitors: jest.fn(),
        getMonitor: jest.fn(),
        createMonitor: jest.fn(),
        muteMonitor: jest.fn(),
        listEvents: jest.fn(),
        createEvent: jest.fn(),
        listIncidents: jest.fn(),
        createIncident: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<DatadogClient>;
}

describe("Datadog Operation Executors", () => {
    let mockClient: jest.Mocked<DatadogClient>;

    beforeEach(() => {
        mockClient = createMockDatadogClient();
    });

    // ============================================
    // Metrics Operations
    // ============================================

    describe("executeQueryMetrics", () => {
        it("calls client with correct params", async () => {
            mockClient.queryMetrics.mockResolvedValueOnce({
                status: "ok",
                res_type: "time_series",
                from_date: 1700000000,
                to_date: 1700003600,
                series: [],
                query: "avg:system.cpu.user{*}"
            });

            await executeQueryMetrics(mockClient, {
                query: "avg:system.cpu.user{*}",
                from: 1700000000,
                to: 1700003600
            });

            expect(mockClient.queryMetrics).toHaveBeenCalledWith({
                query: "avg:system.cpu.user{*}",
                from: 1700000000,
                to: 1700003600
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.queryMetrics.mockResolvedValueOnce({
                status: "ok",
                res_type: "time_series",
                from_date: 1700000000,
                to_date: 1700003600,
                series: [
                    {
                        metric: "system.cpu.user",
                        display_name: "CPU User",
                        pointlist: [
                            [1700000000, 45.5],
                            [1700001000, 52.3]
                        ],
                        unit: [{ family: "percentage", name: "percent", short_name: "%" }],
                        scope: "host:myhost",
                        expression: "avg:system.cpu.user{*}"
                    }
                ],
                query: "avg:system.cpu.user{*}"
            });

            const result = await executeQueryMetrics(mockClient, {
                query: "avg:system.cpu.user{*}",
                from: 1700000000,
                to: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                query: "avg:system.cpu.user{*}",
                fromDate: 1700000000,
                toDate: 1700003600,
                series: [
                    {
                        metric: "system.cpu.user",
                        displayName: "CPU User",
                        points: [
                            { timestamp: 1700000000, value: 45.5 },
                            { timestamp: 1700001000, value: 52.3 }
                        ],
                        unit: "%",
                        scope: "host:myhost",
                        expression: "avg:system.cpu.user{*}"
                    }
                ]
            });
        });

        it("handles missing unit", async () => {
            mockClient.queryMetrics.mockResolvedValueOnce({
                status: "ok",
                res_type: "time_series",
                from_date: 1700000000,
                to_date: 1700003600,
                series: [
                    {
                        metric: "custom.metric",
                        display_name: "Custom Metric",
                        pointlist: [[1700000000, 100]],
                        scope: "*",
                        expression: "avg:custom.metric{*}"
                    }
                ],
                query: "avg:custom.metric{*}"
            });

            const result = await executeQueryMetrics(mockClient, {
                query: "avg:custom.metric{*}",
                from: 1700000000,
                to: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data?.series[0].unit).toBeUndefined();
        });

        it("handles empty series", async () => {
            mockClient.queryMetrics.mockResolvedValueOnce({
                status: "ok",
                res_type: "time_series",
                from_date: 1700000000,
                to_date: 1700003600,
                series: [],
                query: "avg:nonexistent.metric{*}"
            });

            const result = await executeQueryMetrics(mockClient, {
                query: "avg:nonexistent.metric{*}",
                from: 1700000000,
                to: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data?.series).toHaveLength(0);
        });

        it("returns error on client failure", async () => {
            mockClient.queryMetrics.mockRejectedValueOnce(new Error("Invalid query syntax"));

            const result = await executeQueryMetrics(mockClient, {
                query: "bad:query",
                from: 1700000000,
                to: 1700003600
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid query syntax");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.queryMetrics.mockRejectedValueOnce("string error");

            const result = await executeQueryMetrics(mockClient, {
                query: "avg:system.cpu.user{*}",
                from: 1700000000,
                to: 1700003600
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to query metrics");
        });
    });

    describe("executeSubmitMetrics", () => {
        it("calls client with correct params", async () => {
            mockClient.submitMetrics.mockResolvedValueOnce({ status: "ok" });

            await executeSubmitMetrics(mockClient, {
                series: [
                    {
                        metric: "custom.requests",
                        points: [[1700000000, 100]],
                        tags: ["env:prod"],
                        type: "gauge"
                    }
                ]
            });

            expect(mockClient.submitMetrics).toHaveBeenCalledWith({
                series: [
                    {
                        metric: "custom.requests",
                        points: [[1700000000, 100]],
                        tags: ["env:prod"],
                        type: "gauge"
                    }
                ]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.submitMetrics.mockResolvedValueOnce({ status: "ok" });

            const result = await executeSubmitMetrics(mockClient, {
                series: [
                    {
                        metric: "custom.metric1",
                        points: [
                            [1700000000, 10],
                            [1700001000, 20]
                        ]
                    },
                    {
                        metric: "custom.metric2",
                        points: [[1700000000, 50]]
                    }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                status: "ok",
                seriesCount: 2,
                totalPoints: 3
            });
        });

        it("handles single metric submission", async () => {
            mockClient.submitMetrics.mockResolvedValueOnce({ status: "ok" });

            const result = await executeSubmitMetrics(mockClient, {
                series: [
                    {
                        metric: "custom.single",
                        points: [[1700000000, 42]]
                    }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data?.seriesCount).toBe(1);
            expect(result.data?.totalPoints).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.submitMetrics.mockRejectedValueOnce(
                new Error(
                    "Datadog authentication failed. Please check your API Key and Application Key."
                )
            );

            const result = await executeSubmitMetrics(mockClient, {
                series: [{ metric: "test", points: [[1700000000, 1]] }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.submitMetrics.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeSubmitMetrics(mockClient, {
                series: [{ metric: "test", points: [[1700000000, 1]] }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to submit metrics");
        });
    });

    // ============================================
    // Monitor Operations
    // ============================================

    describe("executeListMonitors", () => {
        it("calls client with default params", async () => {
            mockClient.listMonitors.mockResolvedValueOnce([]);

            await executeListMonitors(mockClient, {});

            expect(mockClient.listMonitors).toHaveBeenCalledWith({
                tags: undefined,
                page: undefined,
                page_size: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listMonitors.mockResolvedValueOnce([]);

            await executeListMonitors(mockClient, {
                tags: ["env:prod", "service:api"],
                page: 2,
                pageSize: 50
            });

            expect(mockClient.listMonitors).toHaveBeenCalledWith({
                tags: ["env:prod", "service:api"],
                page: 2,
                page_size: 50
            });
        });

        it("returns normalized monitor output", async () => {
            mockClient.listMonitors.mockResolvedValueOnce([
                {
                    id: 12345,
                    name: "High CPU Monitor",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                    message: "CPU is high @slack-alerts",
                    tags: ["env:prod"],
                    priority: 2,
                    overall_state: "Alert",
                    created: "2023-11-14T10:00:00Z",
                    modified: "2023-11-14T12:00:00Z"
                },
                {
                    id: 12346,
                    name: "Disk Space Monitor",
                    type: "metric alert",
                    query: "avg(last_5m):avg:system.disk.used{*} > 80",
                    message: "Disk space low",
                    overall_state: "OK",
                    created: "2023-11-10T08:00:00Z"
                }
            ]);

            const result = await executeListMonitors(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.monitors).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.monitors[0]).toEqual({
                id: 12345,
                name: "High CPU Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "CPU is high @slack-alerts",
                tags: ["env:prod"],
                priority: 2,
                overallState: "Alert",
                createdAt: "2023-11-14T10:00:00Z",
                modifiedAt: "2023-11-14T12:00:00Z"
            });
        });

        it("handles monitors without tags", async () => {
            mockClient.listMonitors.mockResolvedValueOnce([
                {
                    id: 12345,
                    name: "No Tags Monitor",
                    type: "metric alert",
                    query: "query",
                    message: "message",
                    overall_state: "OK"
                }
            ]);

            const result = await executeListMonitors(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.monitors[0].tags).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.listMonitors.mockRejectedValueOnce(
                new Error(
                    "Datadog permission denied. Your keys may not have access to this resource."
                )
            );

            const result = await executeListMonitors(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetMonitor", () => {
        it("calls client with correct params", async () => {
            mockClient.getMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "Test Monitor",
                type: "metric alert",
                query: "query",
                message: "message"
            });

            await executeGetMonitor(mockClient, { monitorId: 12345 });

            expect(mockClient.getMonitor).toHaveBeenCalledWith(12345);
        });

        it("returns normalized output on success", async () => {
            mockClient.getMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "High CPU Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "CPU high @slack-alerts",
                tags: ["env:prod", "team:platform"],
                priority: 1,
                overall_state: "OK",
                options: {
                    notify_no_data: true,
                    no_data_timeframe: 10,
                    thresholds: { critical: 90, warning: 80 }
                },
                created: "2023-11-14T10:00:00Z",
                modified: "2023-11-14T12:00:00Z"
            });

            const result = await executeGetMonitor(mockClient, { monitorId: 12345 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 12345,
                name: "High CPU Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "CPU high @slack-alerts",
                tags: ["env:prod", "team:platform"],
                priority: 1,
                overallState: "OK",
                options: {
                    notify_no_data: true,
                    no_data_timeframe: 10,
                    thresholds: { critical: 90, warning: 80 }
                },
                createdAt: "2023-11-14T10:00:00Z",
                modifiedAt: "2023-11-14T12:00:00Z"
            });
        });

        it("handles monitor without optional fields", async () => {
            mockClient.getMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "Simple Monitor",
                type: "metric alert",
                query: "query",
                message: "message"
            });

            const result = await executeGetMonitor(mockClient, { monitorId: 12345 });

            expect(result.success).toBe(true);
            expect(result.data?.tags).toEqual([]);
            expect(result.data?.priority).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getMonitor.mockRejectedValueOnce(
                new Error("Resource not found in Datadog.")
            );

            const result = await executeGetMonitor(mockClient, { monitorId: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Datadog.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateMonitor", () => {
        it("calls client with correct params", async () => {
            mockClient.createMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!",
                tags: ["env:prod"],
                priority: 2
            });

            await executeCreateMonitor(mockClient, {
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!",
                tags: ["env:prod"],
                priority: 2
            });

            expect(mockClient.createMonitor).toHaveBeenCalledWith({
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!",
                tags: ["env:prod"],
                priority: 2
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!",
                tags: ["env:prod"],
                priority: 2,
                overall_state: "No Data",
                created: "2023-11-14T10:00:00Z"
            });

            const result = await executeCreateMonitor(mockClient, {
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 12345,
                name: "New Monitor",
                type: "metric alert",
                query: "avg(last_5m):avg:system.cpu.user{*} > 90",
                message: "Alert!",
                tags: ["env:prod"],
                priority: 2,
                overallState: "No Data",
                createdAt: "2023-11-14T10:00:00Z"
            });
        });

        it("handles minimal create params", async () => {
            mockClient.createMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "Minimal Monitor",
                type: "metric alert",
                query: "query",
                message: "message"
            });

            const result = await executeCreateMonitor(mockClient, {
                name: "Minimal Monitor",
                type: "metric alert",
                query: "query",
                message: "message"
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe(12345);
            expect(result.data?.tags).toEqual([]);
        });

        it("returns error on client failure (non-retryable)", async () => {
            mockClient.createMonitor.mockRejectedValueOnce(
                new Error("Datadog API error: Invalid query format")
            );

            const result = await executeCreateMonitor(mockClient, {
                name: "Bad Monitor",
                type: "metric alert",
                query: "invalid query",
                message: "message"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("Invalid query format");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeMuteMonitor", () => {
        it("calls client with correct params", async () => {
            mockClient.muteMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "Muted Monitor",
                type: "metric alert",
                query: "query",
                message: "message",
                overall_state: "No Data"
            });

            await executeMuteMonitor(mockClient, {
                monitorId: 12345,
                scope: "host:myhost",
                end: 1700100000
            });

            expect(mockClient.muteMonitor).toHaveBeenCalledWith(12345, {
                scope: "host:myhost",
                end: 1700100000
            });
        });

        it("calls client with only monitorId", async () => {
            mockClient.muteMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "Muted Monitor",
                type: "metric alert",
                query: "query",
                message: "message",
                overall_state: "No Data"
            });

            await executeMuteMonitor(mockClient, { monitorId: 12345 });

            expect(mockClient.muteMonitor).toHaveBeenCalledWith(12345, {
                scope: undefined,
                end: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.muteMonitor.mockResolvedValueOnce({
                id: 12345,
                name: "High CPU Monitor",
                type: "metric alert",
                query: "query",
                message: "message",
                overall_state: "Alert"
            });

            const result = await executeMuteMonitor(mockClient, { monitorId: 12345 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 12345,
                name: "High CPU Monitor",
                muted: true,
                overallState: "Alert"
            });
        });

        it("returns error on client failure (non-retryable)", async () => {
            mockClient.muteMonitor.mockRejectedValueOnce(
                new Error("Resource not found in Datadog.")
            );

            const result = await executeMuteMonitor(mockClient, { monitorId: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Datadog.");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // Event Operations
    // ============================================

    describe("executeListEvents", () => {
        it("calls client with correct params", async () => {
            mockClient.listEvents.mockResolvedValueOnce({ events: [] });

            await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600,
                tags: ["env:prod"],
                sources: ["datadog"],
                priority: "normal"
            });

            expect(mockClient.listEvents).toHaveBeenCalledWith({
                start: 1700000000,
                end: 1700003600,
                tags: ["env:prod"],
                sources: ["datadog"],
                priority: "normal"
            });
        });

        it("calls client with minimal params", async () => {
            mockClient.listEvents.mockResolvedValueOnce({ events: [] });

            await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600
            });

            expect(mockClient.listEvents).toHaveBeenCalledWith({
                start: 1700000000,
                end: 1700003600,
                tags: undefined,
                sources: undefined,
                priority: undefined
            });
        });

        it("returns normalized event output", async () => {
            mockClient.listEvents.mockResolvedValueOnce({
                events: [
                    {
                        id: 123456789,
                        title: "Deployment started",
                        text: "Deploying v1.2.3 to production",
                        date_happened: 1700001000,
                        priority: "normal",
                        host: "deploy-host",
                        tags: ["env:prod", "action:deploy"],
                        alert_type: "info"
                    },
                    {
                        id: 123456790,
                        title: "Error spike detected",
                        text: "Error rate exceeded threshold",
                        date_happened: 1700002000,
                        priority: "normal",
                        alert_type: "error"
                    }
                ]
            });

            const result = await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data?.events).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.events[0]).toEqual({
                id: 123456789,
                title: "Deployment started",
                text: "Deploying v1.2.3 to production",
                dateHappened: 1700001000,
                priority: "normal",
                host: "deploy-host",
                tags: ["env:prod", "action:deploy"],
                alertType: "info"
            });
        });

        it("handles events without optional fields", async () => {
            mockClient.listEvents.mockResolvedValueOnce({
                events: [
                    {
                        id: 123456789,
                        title: "Simple Event",
                        text: "Event text"
                    }
                ]
            });

            const result = await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data?.events[0]).toEqual({
                id: 123456789,
                title: "Simple Event",
                text: "Event text",
                dateHappened: undefined,
                priority: "normal",
                host: undefined,
                tags: [],
                alertType: "info"
            });
        });

        it("handles empty events array", async () => {
            mockClient.listEvents.mockResolvedValueOnce({ events: [] });

            const result = await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600
            });

            expect(result.success).toBe(true);
            expect(result.data?.events).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listEvents.mockRejectedValueOnce(
                new Error("Datadog rate limit exceeded. Please try again later.")
            );

            const result = await executeListEvents(mockClient, {
                start: 1700000000,
                end: 1700003600
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("rate limit");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                event: {
                    id: 123456789,
                    title: "Deployment Complete",
                    text: "v1.2.3 deployed"
                },
                status: "ok"
            });

            await executeCreateEvent(mockClient, {
                title: "Deployment Complete",
                text: "v1.2.3 deployed",
                tags: ["env:prod"],
                alertType: "success",
                priority: "normal",
                host: "deploy-host"
            });

            expect(mockClient.createEvent).toHaveBeenCalledWith({
                title: "Deployment Complete",
                text: "v1.2.3 deployed",
                tags: ["env:prod"],
                alert_type: "success",
                priority: "normal",
                host: "deploy-host"
            });
        });

        it("calls client with minimal params", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                event: {
                    id: 123456789,
                    title: "Simple Event",
                    text: "Event text"
                },
                status: "ok"
            });

            await executeCreateEvent(mockClient, {
                title: "Simple Event",
                text: "Event text"
            });

            expect(mockClient.createEvent).toHaveBeenCalledWith({
                title: "Simple Event",
                text: "Event text",
                tags: undefined,
                alert_type: undefined,
                priority: undefined,
                host: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                event: {
                    id: 123456789,
                    title: "Deployment Complete",
                    text: "v1.2.3 deployed"
                },
                status: "ok"
            });

            const result = await executeCreateEvent(mockClient, {
                title: "Deployment Complete",
                text: "v1.2.3 deployed"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 123456789,
                title: "Deployment Complete",
                status: "ok"
            });
        });

        it("returns error on client failure (non-retryable)", async () => {
            mockClient.createEvent.mockRejectedValueOnce(
                new Error("Datadog API error: Invalid event format")
            );

            const result = await executeCreateEvent(mockClient, {
                title: "Bad Event",
                text: ""
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("Invalid event format");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createEvent.mockRejectedValueOnce(null);

            const result = await executeCreateEvent(mockClient, {
                title: "Test",
                text: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create event");
        });
    });

    // ============================================
    // Incident Operations
    // ============================================

    describe("executeListIncidents", () => {
        it("calls client with default params", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({ data: [] });

            await executeListIncidents(mockClient, {});

            expect(mockClient.listIncidents).toHaveBeenCalledWith({
                page_offset: undefined,
                page_size: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({ data: [] });

            await executeListIncidents(mockClient, {
                pageOffset: 10,
                pageSize: 25
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith({
                page_offset: 10,
                page_size: 25
            });
        });

        it("returns normalized incident output", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [
                    {
                        id: "incident-123",
                        type: "incidents",
                        attributes: {
                            title: "Production Outage",
                            customer_impact_scope: "All users affected",
                            customer_impacted: true,
                            severity: "SEV-1",
                            state: "active",
                            detected: "2023-11-14T10:00:00Z",
                            created: "2023-11-14T10:05:00Z",
                            modified: "2023-11-14T10:30:00Z"
                        }
                    },
                    {
                        id: "incident-124",
                        type: "incidents",
                        attributes: {
                            title: "Minor API Latency",
                            customer_impacted: false,
                            severity: "SEV-3",
                            state: "resolved",
                            resolved: "2023-11-14T09:00:00Z"
                        }
                    }
                ],
                meta: {
                    pagination: { offset: 0, size: 25 }
                }
            });

            const result = await executeListIncidents(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.incidents).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.pagination).toEqual({ offset: 0, size: 25 });
            expect(result.data?.incidents[0]).toEqual({
                id: "incident-123",
                title: "Production Outage",
                customerImpactScope: "All users affected",
                customerImpacted: true,
                severity: "SEV-1",
                state: "active",
                detected: "2023-11-14T10:00:00Z",
                created: "2023-11-14T10:05:00Z",
                modified: "2023-11-14T10:30:00Z",
                resolved: undefined
            });
        });

        it("handles incidents without attributes", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [
                    {
                        id: "incident-123",
                        type: "incidents"
                    }
                ]
            });

            const result = await executeListIncidents(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.incidents[0]).toEqual({
                id: "incident-123",
                title: "",
                customerImpactScope: undefined,
                customerImpacted: undefined,
                severity: undefined,
                state: undefined,
                detected: undefined,
                created: undefined,
                modified: undefined,
                resolved: undefined
            });
        });

        it("handles empty data array", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({ data: [] });

            const result = await executeListIncidents(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.incidents).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listIncidents.mockRejectedValueOnce(
                new Error(
                    "Datadog permission denied. Your keys may not have access to this resource."
                )
            );

            const result = await executeListIncidents(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateIncident", () => {
        it("calls client with correct params", async () => {
            mockClient.createIncident.mockResolvedValueOnce({
                data: {
                    id: "incident-123",
                    type: "incidents",
                    attributes: {
                        title: "Production Issue",
                        customer_impact_scope: "API endpoints affected",
                        state: "active",
                        created: "2023-11-14T10:00:00Z"
                    }
                }
            });

            await executeCreateIncident(mockClient, {
                title: "Production Issue",
                customerImpactScope: "API endpoints affected",
                fields: { severity: "SEV-2" }
            });

            expect(mockClient.createIncident).toHaveBeenCalledWith({
                title: "Production Issue",
                customer_impact_scope: "API endpoints affected",
                fields: { severity: "SEV-2" }
            });
        });

        it("calls client with minimal params", async () => {
            mockClient.createIncident.mockResolvedValueOnce({
                data: {
                    id: "incident-123",
                    type: "incidents",
                    attributes: {
                        title: "New Incident",
                        state: "active"
                    }
                }
            });

            await executeCreateIncident(mockClient, {
                title: "New Incident"
            });

            expect(mockClient.createIncident).toHaveBeenCalledWith({
                title: "New Incident",
                customer_impact_scope: undefined,
                fields: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createIncident.mockResolvedValueOnce({
                data: {
                    id: "incident-456",
                    type: "incidents",
                    attributes: {
                        title: "Database Issue",
                        customer_impact_scope: "Write operations failing",
                        state: "active",
                        created: "2023-11-14T10:00:00Z"
                    }
                }
            });

            const result = await executeCreateIncident(mockClient, {
                title: "Database Issue",
                customerImpactScope: "Write operations failing"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "incident-456",
                title: "Database Issue",
                customerImpactScope: "Write operations failing",
                state: "active",
                created: "2023-11-14T10:00:00Z"
            });
        });

        it("handles response without attributes", async () => {
            mockClient.createIncident.mockResolvedValueOnce({
                data: {
                    id: "incident-789",
                    type: "incidents"
                }
            });

            const result = await executeCreateIncident(mockClient, {
                title: "Test Incident"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "incident-789",
                title: undefined,
                customerImpactScope: undefined,
                state: undefined,
                created: undefined
            });
        });

        it("returns error on client failure (non-retryable)", async () => {
            mockClient.createIncident.mockRejectedValueOnce(
                new Error("Datadog API error: Missing required field: title")
            );

            const result = await executeCreateIncident(mockClient, {
                title: ""
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("Missing required field");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createIncident.mockRejectedValueOnce(undefined);

            const result = await executeCreateIncident(mockClient, {
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create incident");
        });
    });

    // ============================================
    // Schema Validation Tests
    // ============================================

    describe("schema validation", () => {
        describe("queryMetricsSchema", () => {
            it("validates valid input", () => {
                const result = queryMetricsSchema.safeParse({
                    query: "avg:system.cpu.user{*}",
                    from: 1700000000,
                    to: 1700003600
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty query", () => {
                const result = queryMetricsSchema.safeParse({
                    query: "",
                    from: 1700000000,
                    to: 1700003600
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing from", () => {
                const result = queryMetricsSchema.safeParse({
                    query: "avg:system.cpu.user{*}",
                    to: 1700003600
                });
                expect(result.success).toBe(false);
            });
        });

        describe("submitMetricsSchema", () => {
            it("validates valid input", () => {
                const result = submitMetricsSchema.safeParse({
                    series: [
                        {
                            metric: "custom.metric",
                            points: [[1700000000, 100]]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = submitMetricsSchema.safeParse({
                    series: [
                        {
                            metric: "custom.metric",
                            points: [[1700000000, 100]],
                            tags: ["env:prod"],
                            type: "gauge"
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty series array", () => {
                const result = submitMetricsSchema.safeParse({
                    series: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty points array", () => {
                const result = submitMetricsSchema.safeParse({
                    series: [
                        {
                            metric: "custom.metric",
                            points: []
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid metric type", () => {
                const result = submitMetricsSchema.safeParse({
                    series: [
                        {
                            metric: "custom.metric",
                            points: [[1700000000, 100]],
                            type: "invalid"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listMonitorsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listMonitorsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = listMonitorsSchema.safeParse({
                    tags: ["env:prod"],
                    page: 0,
                    pageSize: 100
                });
                expect(result.success).toBe(true);
            });

            it("rejects negative page", () => {
                const result = listMonitorsSchema.safeParse({
                    page: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize over 1000", () => {
                const result = listMonitorsSchema.safeParse({
                    pageSize: 1001
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize under 1", () => {
                const result = listMonitorsSchema.safeParse({
                    pageSize: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getMonitorSchema", () => {
            it("validates valid monitorId", () => {
                const result = getMonitorSchema.safeParse({
                    monitorId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing monitorId", () => {
                const result = getMonitorSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-integer monitorId", () => {
                const result = getMonitorSchema.safeParse({
                    monitorId: 12345.5
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createMonitorSchema", () => {
            it("validates minimal input", () => {
                const result = createMonitorSchema.safeParse({
                    name: "Test Monitor",
                    type: "metric alert",
                    query: "avg:system.cpu{*} > 90",
                    message: "Alert!"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createMonitorSchema.safeParse({
                    name: "Test Monitor",
                    type: "metric alert",
                    query: "avg:system.cpu{*} > 90",
                    message: "Alert!",
                    tags: ["env:prod"],
                    priority: 3
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createMonitorSchema.safeParse({
                    name: "",
                    type: "metric alert",
                    query: "query",
                    message: "message"
                });
                expect(result.success).toBe(false);
            });

            it("rejects priority out of range", () => {
                const result = createMonitorSchema.safeParse({
                    name: "Test",
                    type: "metric alert",
                    query: "query",
                    message: "message",
                    priority: 6
                });
                expect(result.success).toBe(false);
            });

            it("rejects priority below 1", () => {
                const result = createMonitorSchema.safeParse({
                    name: "Test",
                    type: "metric alert",
                    query: "query",
                    message: "message",
                    priority: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("muteMonitorSchema", () => {
            it("validates with only monitorId", () => {
                const result = muteMonitorSchema.safeParse({
                    monitorId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = muteMonitorSchema.safeParse({
                    monitorId: 12345,
                    scope: "host:myhost",
                    end: 1700100000
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing monitorId", () => {
                const result = muteMonitorSchema.safeParse({
                    scope: "host:myhost"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listEventsSchema", () => {
            it("validates minimal input", () => {
                const result = listEventsSchema.safeParse({
                    start: 1700000000,
                    end: 1700003600
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listEventsSchema.safeParse({
                    start: 1700000000,
                    end: 1700003600,
                    tags: ["env:prod"],
                    sources: ["datadog"],
                    priority: "normal"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid priority", () => {
                const result = listEventsSchema.safeParse({
                    start: 1700000000,
                    end: 1700003600,
                    priority: "high"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing start", () => {
                const result = listEventsSchema.safeParse({
                    end: 1700003600
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createEventSchema", () => {
            it("validates minimal input", () => {
                const result = createEventSchema.safeParse({
                    title: "Event Title",
                    text: "Event description"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createEventSchema.safeParse({
                    title: "Event Title",
                    text: "Event description",
                    tags: ["env:prod"],
                    alertType: "success",
                    priority: "normal",
                    host: "myhost"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty title", () => {
                const result = createEventSchema.safeParse({
                    title: "",
                    text: "text"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid alertType", () => {
                const result = createEventSchema.safeParse({
                    title: "Title",
                    text: "text",
                    alertType: "critical"
                });
                expect(result.success).toBe(false);
            });

            it("validates all alertType values", () => {
                const alertTypes = ["info", "warning", "error", "success"];
                for (const alertType of alertTypes) {
                    const result = createEventSchema.safeParse({
                        title: "Title",
                        text: "text",
                        alertType
                    });
                    expect(result.success).toBe(true);
                }
            });
        });

        describe("listIncidentsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listIncidentsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listIncidentsSchema.safeParse({
                    pageOffset: 0,
                    pageSize: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects negative pageOffset", () => {
                const result = listIncidentsSchema.safeParse({
                    pageOffset: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize over 100", () => {
                const result = listIncidentsSchema.safeParse({
                    pageSize: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize under 1", () => {
                const result = listIncidentsSchema.safeParse({
                    pageSize: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createIncidentSchema", () => {
            it("validates minimal input", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Incident Title"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Incident Title",
                    customerImpactScope: "All users affected",
                    fields: { severity: "SEV-1", team: "platform" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty title", () => {
                const result = createIncidentSchema.safeParse({
                    title: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing title", () => {
                const result = createIncidentSchema.safeParse({
                    customerImpactScope: "scope"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
