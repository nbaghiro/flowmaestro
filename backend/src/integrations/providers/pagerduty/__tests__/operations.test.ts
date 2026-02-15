/**
 * PagerDuty Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateIncident, createIncidentSchema } from "../operations/createIncident";
import { executeGetIncident, getIncidentSchema } from "../operations/getIncident";
import { executeGetService, getServiceSchema } from "../operations/getService";
import {
    executeListEscalationPolicies,
    listEscalationPoliciesSchema
} from "../operations/listEscalationPolicies";
import { executeListIncidents, listIncidentsSchema } from "../operations/listIncidents";
import { executeListOnCalls, listOnCallsSchema } from "../operations/listOnCalls";
import { executeListSchedules, listSchedulesSchema } from "../operations/listSchedules";
import { executeListServices, listServicesSchema } from "../operations/listServices";
import { executeListUsers, listUsersSchema } from "../operations/listUsers";
import { executeUpdateIncident, updateIncidentSchema } from "../operations/updateIncident";
import type {
    PagerDutyClient,
    PagerDutyIncident,
    PagerDutyService,
    PagerDutyEscalationPolicy,
    PagerDutyOnCall,
    PagerDutySchedule,
    PagerDutyUser
} from "../client/PagerDutyClient";

// Mock PagerDutyClient factory
function createMockPagerDutyClient(): jest.Mocked<PagerDutyClient> {
    return {
        listIncidents: jest.fn(),
        getIncident: jest.fn(),
        createIncident: jest.fn(),
        createIncidentWithFrom: jest.fn(),
        updateIncident: jest.fn(),
        listServices: jest.fn(),
        getService: jest.fn(),
        listEscalationPolicies: jest.fn(),
        listOnCalls: jest.fn(),
        listUsers: jest.fn(),
        listSchedules: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<PagerDutyClient>;
}

// Sample fixtures for tests
const sampleIncident: PagerDutyIncident = {
    id: "P1234567",
    type: "incident",
    summary: "High CPU usage on production server",
    self: "https://api.pagerduty.com/incidents/P1234567",
    html_url: "https://acme.pagerduty.com/incidents/P1234567",
    incident_number: 1234,
    title: "High CPU usage on production server",
    description: "Server cpu-01 is experiencing high CPU usage",
    created_at: "2024-12-19T10:00:00Z",
    status: "triggered",
    urgency: "high",
    service: {
        id: "PSERVICE1",
        type: "service_reference",
        summary: "Production API"
    },
    assignments: [
        {
            at: "2024-12-19T10:00:00Z",
            assignee: {
                id: "PUSER001",
                type: "user_reference",
                summary: "John Smith"
            }
        }
    ],
    acknowledgements: [],
    last_status_change_at: "2024-12-19T10:00:00Z",
    escalation_policy: {
        id: "PESCPOL1",
        type: "escalation_policy_reference",
        summary: "Engineering On-Call"
    }
};

const sampleService: PagerDutyService = {
    id: "PSERVICE1",
    type: "service",
    summary: "Production API",
    self: "https://api.pagerduty.com/services/PSERVICE1",
    html_url: "https://acme.pagerduty.com/services/PSERVICE1",
    name: "Production API",
    description: "Core production API service",
    created_at: "2023-01-15T10:00:00Z",
    status: "active",
    alert_creation: "create_incidents",
    escalation_policy: {
        id: "PESCPOL1",
        type: "escalation_policy_reference",
        summary: "Engineering On-Call"
    }
};

const sampleEscalationPolicy: PagerDutyEscalationPolicy = {
    id: "PESCPOL1",
    type: "escalation_policy",
    summary: "Engineering On-Call",
    self: "https://api.pagerduty.com/escalation_policies/PESCPOL1",
    html_url: "https://acme.pagerduty.com/escalation_policies/PESCPOL1",
    name: "Engineering On-Call",
    description: "Primary engineering escalation",
    num_loops: 2,
    on_call_handoff_notifications: "if_has_services",
    escalation_rules: [
        {
            id: "PRULE001",
            escalation_delay_in_minutes: 30,
            targets: [
                {
                    id: "PUSER001",
                    type: "user_reference",
                    summary: "John Smith"
                }
            ]
        }
    ]
};

const sampleOnCall: PagerDutyOnCall = {
    escalation_policy: {
        id: "PESCPOL1",
        type: "escalation_policy_reference",
        summary: "Engineering On-Call"
    },
    escalation_level: 1,
    user: {
        id: "PUSER001",
        type: "user_reference",
        summary: "John Smith",
        email: "john.smith@example.com",
        name: "John Smith"
    },
    start: "2024-12-19T00:00:00Z",
    end: "2024-12-20T00:00:00Z"
};

const sampleSchedule: PagerDutySchedule = {
    id: "PSCHED001",
    type: "schedule",
    summary: "Database Primary",
    self: "https://api.pagerduty.com/schedules/PSCHED001",
    html_url: "https://acme.pagerduty.com/schedules/PSCHED001",
    name: "Database Primary",
    description: "Primary database on-call rotation",
    time_zone: "America/New_York"
};

const sampleUser: PagerDutyUser = {
    id: "PUSER001",
    type: "user",
    summary: "John Smith",
    self: "https://api.pagerduty.com/users/PUSER001",
    html_url: "https://acme.pagerduty.com/users/PUSER001",
    name: "John Smith",
    email: "john.smith@example.com",
    time_zone: "America/New_York",
    role: "admin"
};

describe("PagerDuty Operation Executors", () => {
    let mockClient: jest.Mocked<PagerDutyClient>;

    beforeEach(() => {
        mockClient = createMockPagerDutyClient();
    });

    describe("executeCreateIncident", () => {
        it("calls client with correct params for minimal input", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            await executeCreateIncident(mockClient, {
                title: "High CPU usage on production server",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high"
            });

            expect(mockClient.createIncidentWithFrom).toHaveBeenCalledWith(
                {
                    title: "High CPU usage on production server",
                    service: {
                        id: "PSERVICE1",
                        type: "service_reference"
                    },
                    urgency: "high"
                },
                "admin@example.com"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            const result = await executeCreateIncident(mockClient, {
                title: "High CPU usage on production server",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                incident: sampleIncident,
                incidentId: "P1234567",
                incidentNumber: 1234,
                htmlUrl: "https://acme.pagerduty.com/incidents/P1234567"
            });
        });

        it("passes body details when provided", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            await executeCreateIncident(mockClient, {
                title: "High CPU usage",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high",
                details: "Server cpu-01 is not responding"
            });

            expect(mockClient.createIncidentWithFrom).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: {
                        type: "incident_body",
                        details: "Server cpu-01 is not responding"
                    }
                }),
                "admin@example.com"
            );
        });

        it("passes assigneeIds when provided", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            await executeCreateIncident(mockClient, {
                title: "High CPU usage",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high",
                assigneeIds: ["PUSER001", "PUSER002"]
            });

            expect(mockClient.createIncidentWithFrom).toHaveBeenCalledWith(
                expect.objectContaining({
                    assignments: [
                        { assignee: { id: "PUSER001", type: "user_reference" } },
                        { assignee: { id: "PUSER002", type: "user_reference" } }
                    ]
                }),
                "admin@example.com"
            );
        });

        it("passes escalation policy when provided", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            await executeCreateIncident(mockClient, {
                title: "High CPU usage",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high",
                escalationPolicyId: "PESCPOL2"
            });

            expect(mockClient.createIncidentWithFrom).toHaveBeenCalledWith(
                expect.objectContaining({
                    escalation_policy: {
                        id: "PESCPOL2",
                        type: "escalation_policy_reference"
                    }
                }),
                "admin@example.com"
            );
        });

        it("passes conference bridge when provided", async () => {
            mockClient.createIncidentWithFrom.mockResolvedValueOnce(sampleIncident);

            await executeCreateIncident(mockClient, {
                title: "High CPU usage",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high",
                conferenceNumber: "+1-555-123-4567",
                conferenceUrl: "https://zoom.us/j/123456"
            });

            expect(mockClient.createIncidentWithFrom).toHaveBeenCalledWith(
                expect.objectContaining({
                    conference_bridge: {
                        conference_number: "+1-555-123-4567",
                        conference_url: "https://zoom.us/j/123456"
                    }
                }),
                "admin@example.com"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.createIncidentWithFrom.mockRejectedValueOnce(
                new Error("Service PSERVICE_INVALID not found")
            );

            const result = await executeCreateIncident(mockClient, {
                title: "Test incident",
                serviceId: "PSERVICE_INVALID",
                from: "admin@example.com",
                urgency: "high"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Service PSERVICE_INVALID not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createIncidentWithFrom.mockRejectedValueOnce("string error");

            const result = await executeCreateIncident(mockClient, {
                title: "Test incident",
                serviceId: "PSERVICE1",
                from: "admin@example.com",
                urgency: "high"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create incident");
        });
    });

    describe("executeGetIncident", () => {
        it("calls client with correct params", async () => {
            mockClient.getIncident.mockResolvedValueOnce(sampleIncident);

            await executeGetIncident(mockClient, {
                incidentId: "P1234567"
            });

            expect(mockClient.getIncident).toHaveBeenCalledWith("P1234567");
        });

        it("returns normalized output on success", async () => {
            mockClient.getIncident.mockResolvedValueOnce(sampleIncident);

            const result = await executeGetIncident(mockClient, {
                incidentId: "P1234567"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                incident: sampleIncident
            });
        });

        it("returns not_found error when incident does not exist", async () => {
            mockClient.getIncident.mockRejectedValueOnce(
                new Error("Resource not found in PagerDuty.")
            );

            const result = await executeGetIncident(mockClient, {
                incidentId: "PNONEXISTENT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Incident PNONEXISTENT not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server_error on other client failures", async () => {
            mockClient.getIncident.mockRejectedValueOnce(new Error("Connection timeout"));

            const result = await executeGetIncident(mockClient, {
                incidentId: "P1234567"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Connection timeout");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateIncident", () => {
        it("calls client with acknowledge status", async () => {
            const acknowledgedIncident = { ...sampleIncident, status: "acknowledged" as const };
            mockClient.updateIncident.mockResolvedValueOnce(acknowledgedIncident);

            await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "john.smith@example.com",
                status: "acknowledged"
            });

            expect(mockClient.updateIncident).toHaveBeenCalledWith(
                "P1234567",
                { status: "acknowledged" },
                "john.smith@example.com"
            );
        });

        it("returns normalized output on success", async () => {
            const acknowledgedIncident = { ...sampleIncident, status: "acknowledged" as const };
            mockClient.updateIncident.mockResolvedValueOnce(acknowledgedIncident);

            const result = await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "john.smith@example.com",
                status: "acknowledged"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                incident: acknowledgedIncident,
                incidentId: "P1234567",
                status: "acknowledged",
                htmlUrl: "https://acme.pagerduty.com/incidents/P1234567"
            });
        });

        it("passes resolution when resolving", async () => {
            const resolvedIncident = { ...sampleIncident, status: "resolved" as const };
            mockClient.updateIncident.mockResolvedValueOnce(resolvedIncident);

            await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "john.smith@example.com",
                status: "resolved",
                resolution: "Fixed by restarting the service"
            });

            expect(mockClient.updateIncident).toHaveBeenCalledWith(
                "P1234567",
                {
                    status: "resolved",
                    resolution: "Fixed by restarting the service"
                },
                "john.smith@example.com"
            );
        });

        it("passes assignees for reassignment", async () => {
            mockClient.updateIncident.mockResolvedValueOnce(sampleIncident);

            await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "admin@example.com",
                assignees: [{ id: "PUSER002", type: "user_reference" }]
            });

            expect(mockClient.updateIncident).toHaveBeenCalledWith(
                "P1234567",
                {
                    assignments: [
                        {
                            assignee: {
                                id: "PUSER002",
                                type: "user_reference"
                            }
                        }
                    ]
                },
                "admin@example.com"
            );
        });

        it("passes urgency change", async () => {
            const lowUrgencyIncident = { ...sampleIncident, urgency: "low" as const };
            mockClient.updateIncident.mockResolvedValueOnce(lowUrgencyIncident);

            await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "admin@example.com",
                urgency: "low"
            });

            expect(mockClient.updateIncident).toHaveBeenCalledWith(
                "P1234567",
                { urgency: "low" },
                "admin@example.com"
            );
        });

        it("passes escalation level", async () => {
            mockClient.updateIncident.mockResolvedValueOnce(sampleIncident);

            await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "admin@example.com",
                escalationLevel: 2
            });

            expect(mockClient.updateIncident).toHaveBeenCalledWith(
                "P1234567",
                { escalation_level: 2 },
                "admin@example.com"
            );
        });

        it("returns not_found error when incident does not exist", async () => {
            mockClient.updateIncident.mockRejectedValueOnce(
                new Error("Resource not found in PagerDuty.")
            );

            const result = await executeUpdateIncident(mockClient, {
                incidentId: "PNONEXISTENT",
                from: "admin@example.com",
                status: "acknowledged"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Incident PNONEXISTENT not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server_error on other failures", async () => {
            mockClient.updateIncident.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeUpdateIncident(mockClient, {
                incidentId: "P1234567",
                from: "admin@example.com",
                status: "acknowledged"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListIncidents", () => {
        it("calls client with default params", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListIncidents(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith({
                statuses: undefined,
                urgencies: undefined,
                since: undefined,
                until: undefined,
                service_ids: undefined,
                user_ids: undefined,
                team_ids: undefined,
                sort_by: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with status filter", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [sampleIncident],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListIncidents(mockClient, {
                statuses: ["triggered", "acknowledged"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith(
                expect.objectContaining({
                    statuses: ["triggered", "acknowledged"]
                })
            );
        });

        it("calls client with urgency filter", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [sampleIncident],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListIncidents(mockClient, {
                urgencies: ["high"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith(
                expect.objectContaining({
                    urgencies: ["high"]
                })
            );
        });

        it("calls client with date range filter", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListIncidents(mockClient, {
                since: "2024-12-01T00:00:00Z",
                until: "2024-12-31T23:59:59Z",
                limit: 25,
                offset: 0
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith(
                expect.objectContaining({
                    since: "2024-12-01T00:00:00Z",
                    until: "2024-12-31T23:59:59Z"
                })
            );
        });

        it("calls client with service filter", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [sampleIncident],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListIncidents(mockClient, {
                serviceIds: ["PSERVICE1", "PSERVICE2"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listIncidents).toHaveBeenCalledWith(
                expect.objectContaining({
                    service_ids: ["PSERVICE1", "PSERVICE2"]
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listIncidents.mockResolvedValueOnce({
                data: [sampleIncident],
                offset: 0,
                limit: 25,
                more: true,
                total: 50
            });

            const result = await executeListIncidents(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                incidents: [sampleIncident],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: true,
                    total: 50
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listIncidents.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListIncidents(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetService", () => {
        it("calls client with correct params", async () => {
            mockClient.getService.mockResolvedValueOnce(sampleService);

            await executeGetService(mockClient, {
                serviceId: "PSERVICE1"
            });

            expect(mockClient.getService).toHaveBeenCalledWith("PSERVICE1", undefined);
        });

        it("calls client with include params", async () => {
            mockClient.getService.mockResolvedValueOnce(sampleService);

            await executeGetService(mockClient, {
                serviceId: "PSERVICE1",
                include: ["integrations", "teams"]
            });

            expect(mockClient.getService).toHaveBeenCalledWith("PSERVICE1", [
                "integrations",
                "teams"
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.getService.mockResolvedValueOnce(sampleService);

            const result = await executeGetService(mockClient, {
                serviceId: "PSERVICE1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                service: sampleService
            });
        });

        it("returns not_found error when service does not exist", async () => {
            mockClient.getService.mockRejectedValueOnce(
                new Error("Resource not found in PagerDuty.")
            );

            const result = await executeGetService(mockClient, {
                serviceId: "PSERVICE_INVALID"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Service PSERVICE_INVALID not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server_error on other client failures", async () => {
            mockClient.getService.mockRejectedValueOnce(new Error("Connection timeout"));

            const result = await executeGetService(mockClient, {
                serviceId: "PSERVICE1"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Connection timeout");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListServices", () => {
        it("calls client with default params", async () => {
            mockClient.listServices.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListServices(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(mockClient.listServices).toHaveBeenCalledWith({
                query: undefined,
                team_ids: undefined,
                include: undefined,
                sort_by: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with query filter", async () => {
            mockClient.listServices.mockResolvedValueOnce({
                data: [sampleService],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListServices(mockClient, {
                query: "Production",
                limit: 25,
                offset: 0
            });

            expect(mockClient.listServices).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "Production"
                })
            );
        });

        it("calls client with team filter", async () => {
            mockClient.listServices.mockResolvedValueOnce({
                data: [sampleService],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListServices(mockClient, {
                teamIds: ["PTEAM001"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listServices).toHaveBeenCalledWith(
                expect.objectContaining({
                    team_ids: ["PTEAM001"]
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listServices.mockResolvedValueOnce({
                data: [sampleService],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            const result = await executeListServices(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                services: [sampleService],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: false,
                    total: 1
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listServices.mockRejectedValueOnce(new Error("Authentication failed"));

            const result = await executeListServices(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Authentication failed");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListEscalationPolicies", () => {
        it("calls client with default params", async () => {
            mockClient.listEscalationPolicies.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListEscalationPolicies(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(mockClient.listEscalationPolicies).toHaveBeenCalledWith({
                query: undefined,
                user_ids: undefined,
                team_ids: undefined,
                include: undefined,
                sort_by: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with query filter", async () => {
            mockClient.listEscalationPolicies.mockResolvedValueOnce({
                data: [sampleEscalationPolicy],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListEscalationPolicies(mockClient, {
                query: "Engineering",
                limit: 25,
                offset: 0
            });

            expect(mockClient.listEscalationPolicies).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "Engineering"
                })
            );
        });

        it("calls client with user filter", async () => {
            mockClient.listEscalationPolicies.mockResolvedValueOnce({
                data: [sampleEscalationPolicy],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListEscalationPolicies(mockClient, {
                userIds: ["PUSER001"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listEscalationPolicies).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_ids: ["PUSER001"]
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listEscalationPolicies.mockResolvedValueOnce({
                data: [sampleEscalationPolicy],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            const result = await executeListEscalationPolicies(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                escalationPolicies: [sampleEscalationPolicy],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: false,
                    total: 1
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listEscalationPolicies.mockRejectedValueOnce(
                new Error("Rate limit exceeded")
            );

            const result = await executeListEscalationPolicies(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListOnCalls", () => {
        it("calls client with default params", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListOnCalls(mockClient, {
                earliest: false,
                limit: 25,
                offset: 0
            });

            expect(mockClient.listOnCalls).toHaveBeenCalledWith({
                escalation_policy_ids: undefined,
                schedule_ids: undefined,
                user_ids: undefined,
                since: undefined,
                until: undefined,
                earliest: false,
                include: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with earliest flag", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [sampleOnCall],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListOnCalls(mockClient, {
                earliest: true,
                limit: 25,
                offset: 0
            });

            expect(mockClient.listOnCalls).toHaveBeenCalledWith(
                expect.objectContaining({
                    earliest: true
                })
            );
        });

        it("calls client with escalation policy filter", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [sampleOnCall],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListOnCalls(mockClient, {
                escalationPolicyIds: ["PESCPOL1"],
                earliest: false,
                limit: 25,
                offset: 0
            });

            expect(mockClient.listOnCalls).toHaveBeenCalledWith(
                expect.objectContaining({
                    escalation_policy_ids: ["PESCPOL1"]
                })
            );
        });

        it("calls client with schedule filter", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [sampleOnCall],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListOnCalls(mockClient, {
                scheduleIds: ["PSCHED001"],
                earliest: false,
                limit: 25,
                offset: 0
            });

            expect(mockClient.listOnCalls).toHaveBeenCalledWith(
                expect.objectContaining({
                    schedule_ids: ["PSCHED001"]
                })
            );
        });

        it("calls client with date range", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [sampleOnCall],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListOnCalls(mockClient, {
                since: "2024-12-19T00:00:00Z",
                until: "2024-12-20T00:00:00Z",
                earliest: false,
                limit: 25,
                offset: 0
            });

            expect(mockClient.listOnCalls).toHaveBeenCalledWith(
                expect.objectContaining({
                    since: "2024-12-19T00:00:00Z",
                    until: "2024-12-20T00:00:00Z"
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listOnCalls.mockResolvedValueOnce({
                data: [sampleOnCall],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            const result = await executeListOnCalls(mockClient, {
                earliest: true,
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                onCalls: [sampleOnCall],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: false,
                    total: 1
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listOnCalls.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListOnCalls(mockClient, {
                earliest: false,
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListSchedules", () => {
        it("calls client with default params", async () => {
            mockClient.listSchedules.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListSchedules(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(mockClient.listSchedules).toHaveBeenCalledWith({
                query: undefined,
                include: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with query filter", async () => {
            mockClient.listSchedules.mockResolvedValueOnce({
                data: [sampleSchedule],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListSchedules(mockClient, {
                query: "Database",
                limit: 25,
                offset: 0
            });

            expect(mockClient.listSchedules).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "Database"
                })
            );
        });

        it("calls client with include params", async () => {
            mockClient.listSchedules.mockResolvedValueOnce({
                data: [sampleSchedule],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListSchedules(mockClient, {
                include: ["schedule_layers", "final_schedule"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listSchedules).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: ["schedule_layers", "final_schedule"]
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listSchedules.mockResolvedValueOnce({
                data: [sampleSchedule],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            const result = await executeListSchedules(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                schedules: [sampleSchedule],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: false,
                    total: 1
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listSchedules.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListSchedules(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListUsers", () => {
        it("calls client with default params", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                data: [],
                offset: 0,
                limit: 25,
                more: false,
                total: 0
            });

            await executeListUsers(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith({
                query: undefined,
                team_ids: undefined,
                include: undefined,
                limit: 25,
                offset: 0
            });
        });

        it("calls client with query filter", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                data: [sampleUser],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListUsers(mockClient, {
                query: "john",
                limit: 25,
                offset: 0
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: "john"
                })
            );
        });

        it("calls client with team filter", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                data: [sampleUser],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListUsers(mockClient, {
                teamIds: ["PTEAM001"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith(
                expect.objectContaining({
                    team_ids: ["PTEAM001"]
                })
            );
        });

        it("calls client with include params", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                data: [sampleUser],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            await executeListUsers(mockClient, {
                include: ["contact_methods", "notification_rules"],
                limit: 25,
                offset: 0
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: ["contact_methods", "notification_rules"]
                })
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                data: [sampleUser],
                offset: 0,
                limit: 25,
                more: false,
                total: 1
            });

            const result = await executeListUsers(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                users: [sampleUser],
                pagination: {
                    offset: 0,
                    limit: 25,
                    more: false,
                    total: 1
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listUsers.mockRejectedValueOnce(new Error("Access denied"));

            const result = await executeListUsers(mockClient, {
                limit: 25,
                offset: 0
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Access denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("schema validation", () => {
        describe("createIncidentSchema", () => {
            it("validates minimal input", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com",
                    urgency: "high",
                    details: "Description",
                    incidentKey: "unique-key-123",
                    escalationPolicyId: "PESCPOL1",
                    priorityId: "PPRI001",
                    assigneeIds: ["PUSER001"],
                    conferenceNumber: "+1-555-123-4567",
                    conferenceUrl: "https://zoom.us/j/123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing title", () => {
                const result = createIncidentSchema.safeParse({
                    serviceId: "PSERVICE1",
                    from: "admin@example.com"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing serviceId", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Test incident",
                    from: "admin@example.com"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "invalid-email"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid urgency", () => {
                const result = createIncidentSchema.safeParse({
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com",
                    urgency: "critical"
                });
                expect(result.success).toBe(false);
            });

            it("applies default urgency", () => {
                const result = createIncidentSchema.parse({
                    title: "Test incident",
                    serviceId: "PSERVICE1",
                    from: "admin@example.com"
                });
                expect(result.urgency).toBe("high");
            });
        });

        describe("getIncidentSchema", () => {
            it("validates valid input", () => {
                const result = getIncidentSchema.safeParse({
                    incidentId: "P1234567"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing incidentId", () => {
                const result = getIncidentSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty incidentId", () => {
                const result = getIncidentSchema.safeParse({
                    incidentId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateIncidentSchema", () => {
            it("validates minimal input", () => {
                const result = updateIncidentSchema.safeParse({
                    incidentId: "P1234567",
                    from: "admin@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates status change", () => {
                const result = updateIncidentSchema.safeParse({
                    incidentId: "P1234567",
                    from: "admin@example.com",
                    status: "acknowledged"
                });
                expect(result.success).toBe(true);
            });

            it("validates reassignment", () => {
                const result = updateIncidentSchema.safeParse({
                    incidentId: "P1234567",
                    from: "admin@example.com",
                    assignees: [{ id: "PUSER001", type: "user_reference" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = updateIncidentSchema.safeParse({
                    incidentId: "P1234567",
                    from: "admin@example.com",
                    status: "triggered"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid assignee type", () => {
                const result = updateIncidentSchema.safeParse({
                    incidentId: "P1234567",
                    from: "admin@example.com",
                    assignees: [{ id: "PUSER001", type: "invalid_type" }]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listIncidentsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listIncidentsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with status filter", () => {
                const result = listIncidentsSchema.safeParse({
                    statuses: ["triggered", "acknowledged"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with urgency filter", () => {
                const result = listIncidentsSchema.safeParse({
                    urgencies: ["high"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = listIncidentsSchema.safeParse({
                    statuses: ["invalid"]
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit over 100", () => {
                const result = listIncidentsSchema.safeParse({
                    limit: 200
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative offset", () => {
                const result = listIncidentsSchema.safeParse({
                    offset: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listIncidentsSchema.parse({});
                expect(result.limit).toBe(25);
                expect(result.offset).toBe(0);
            });
        });

        describe("getServiceSchema", () => {
            it("validates minimal input", () => {
                const result = getServiceSchema.safeParse({
                    serviceId: "PSERVICE1"
                });
                expect(result.success).toBe(true);
            });

            it("validates with include", () => {
                const result = getServiceSchema.safeParse({
                    serviceId: "PSERVICE1",
                    include: ["integrations", "teams"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid include value", () => {
                const result = getServiceSchema.safeParse({
                    serviceId: "PSERVICE1",
                    include: ["invalid"]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listServicesSchema", () => {
            it("validates empty input", () => {
                const result = listServicesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with query", () => {
                const result = listServicesSchema.safeParse({
                    query: "Production"
                });
                expect(result.success).toBe(true);
            });

            it("validates with sortBy", () => {
                const result = listServicesSchema.safeParse({
                    sortBy: "name"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid sortBy", () => {
                const result = listServicesSchema.safeParse({
                    sortBy: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listEscalationPoliciesSchema", () => {
            it("validates empty input", () => {
                const result = listEscalationPoliciesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listEscalationPoliciesSchema.safeParse({
                    query: "Engineering",
                    userIds: ["PUSER001"],
                    teamIds: ["PTEAM001"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with include", () => {
                const result = listEscalationPoliciesSchema.safeParse({
                    include: ["services", "teams", "targets"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listOnCallsSchema", () => {
            it("validates empty input", () => {
                const result = listOnCallsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with earliest flag", () => {
                const result = listOnCallsSchema.safeParse({
                    earliest: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listOnCallsSchema.safeParse({
                    escalationPolicyIds: ["PESCPOL1"],
                    scheduleIds: ["PSCHED001"],
                    userIds: ["PUSER001"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with date range", () => {
                const result = listOnCallsSchema.safeParse({
                    since: "2024-12-19T00:00:00Z",
                    until: "2024-12-20T00:00:00Z"
                });
                expect(result.success).toBe(true);
            });

            it("applies default for earliest", () => {
                const result = listOnCallsSchema.parse({});
                expect(result.earliest).toBe(false);
            });
        });

        describe("listSchedulesSchema", () => {
            it("validates empty input", () => {
                const result = listSchedulesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with query", () => {
                const result = listSchedulesSchema.safeParse({
                    query: "Database"
                });
                expect(result.success).toBe(true);
            });

            it("validates with include", () => {
                const result = listSchedulesSchema.safeParse({
                    include: ["schedule_layers", "final_schedule", "users"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid include value", () => {
                const result = listSchedulesSchema.safeParse({
                    include: ["invalid"]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listUsersSchema", () => {
            it("validates empty input", () => {
                const result = listUsersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with query", () => {
                const result = listUsersSchema.safeParse({
                    query: "john"
                });
                expect(result.success).toBe(true);
            });

            it("validates with include", () => {
                const result = listUsersSchema.safeParse({
                    include: ["contact_methods", "notification_rules", "teams"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with team filter", () => {
                const result = listUsersSchema.safeParse({
                    teamIds: ["PTEAM001", "PTEAM002"]
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listUsersSchema.parse({});
                expect(result.limit).toBe(25);
                expect(result.offset).toBe(0);
            });
        });
    });
});
