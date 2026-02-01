/**
 * SandboxDataService Unit Tests
 *
 * Tests for mock response retrieval, scenario management,
 * filtering, pagination, and response interpolation.
 */

import { fixtureRegistry } from "../FixtureRegistry";
import { SandboxDataService } from "../SandboxDataService";

describe("SandboxDataService", () => {
    let service: SandboxDataService;

    beforeEach(() => {
        service = new SandboxDataService();
        fixtureRegistry.clear();
    });

    describe("registerScenario / clearScenarios / removeScenario", () => {
        it("registers a scenario", async () => {
            service.registerScenario({
                id: "test-scenario",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { messageId: "123" }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});

            expect(response).toBeDefined();
            expect(response?.success).toBe(true);
            expect(response?.data).toEqual({ messageId: "123" });
        });

        it("clears all scenarios", async () => {
            service.registerScenario({
                id: "test-1",
                provider: "slack",
                operation: "sendMessage",
                response: { success: true, data: {} }
            });
            service.registerScenario({
                id: "test-2",
                provider: "github",
                operation: "createIssue",
                response: { success: true, data: {} }
            });

            service.clearScenarios();

            const response1 = await service.getSandboxResponse("slack", "sendMessage", {});
            const response2 = await service.getSandboxResponse("github", "createIssue", {});

            expect(response1).toBeNull();
            expect(response2).toBeNull();
        });

        it("removes specific scenario by ID", async () => {
            service.registerScenario({
                id: "keep-this",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#keep" },
                response: { success: true, data: { kept: true } }
            });
            service.registerScenario({
                id: "remove-this",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#remove" },
                response: { success: true, data: { removed: true } }
            });

            service.removeScenario("remove-this");

            const kept = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#keep"
            });
            const removed = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#remove"
            });

            expect(kept?.data).toEqual({ kept: true });
            expect(removed).toBeNull();
        });
    });

    describe("getSandboxResponse", () => {
        it("returns registered scenario response", async () => {
            service.registerScenario({
                id: "test",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { messageId: "scenario-123" }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#general",
                text: "Hello"
            });

            expect(response?.data).toEqual({ messageId: "scenario-123" });
        });

        it("returns fixture data when no scenario matches", async () => {
            fixtureRegistry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    {
                        name: "basic",
                        input: {},
                        expectedOutput: { messageId: "fixture-123" }
                    }
                ],
                errorCases: []
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});

            expect(response?.data).toEqual({ messageId: "fixture-123" });
        });

        it("prioritizes scenarios over fixtures", async () => {
            service.registerScenario({
                id: "scenario",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { source: "scenario" }
                }
            });

            fixtureRegistry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    {
                        name: "basic",
                        input: {},
                        expectedOutput: { source: "fixture" }
                    }
                ],
                errorCases: []
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});

            expect(response?.data).toEqual({ source: "scenario" });
        });

        it("returns null when no data exists", async () => {
            const response = await service.getSandboxResponse("slack", "unknownOp", {});

            expect(response).toBeNull();
        });

        it("matches scenarios with paramMatchers", async () => {
            // Note: scenarios are added to the front (unshift), so register
            // the default scenario FIRST, then specific scenarios
            // This way specific scenarios are checked before the default
            service.registerScenario({
                id: "default",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { channel: "default" }
                }
            });
            service.registerScenario({
                id: "specific-channel",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#specific" },
                response: {
                    success: true,
                    data: { channel: "specific" }
                }
            });

            const specificResponse = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#specific"
            });
            const otherResponse = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#other"
            });

            expect(specificResponse?.data).toEqual({ channel: "specific" });
            expect(otherResponse?.data).toEqual({ channel: "default" });
        });

        it("applies delay when specified", async () => {
            service.registerScenario({
                id: "delayed",
                provider: "slack",
                operation: "sendMessage",
                delay: 100,
                response: { success: true, data: {} }
            });

            const start = Date.now();
            await service.getSandboxResponse("slack", "sendMessage", {});
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(90);
        });
    });

    describe("hasSandboxData", () => {
        it("returns true when scenario exists", () => {
            service.registerScenario({
                id: "test",
                provider: "slack",
                operation: "sendMessage",
                response: { success: true, data: {} }
            });

            expect(service.hasSandboxData("slack", "sendMessage")).toBe(true);
        });

        it("returns true when fixture exists", () => {
            fixtureRegistry.register({
                provider: "github",
                operationId: "createIssue",
                validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                errorCases: []
            });

            expect(service.hasSandboxData("github", "createIssue")).toBe(true);
        });

        it("returns false when nothing exists", () => {
            expect(service.hasSandboxData("slack", "unknownOp")).toBe(false);
        });
    });

    describe("filterable data - Airtable style", () => {
        beforeEach(() => {
            fixtureRegistry.register({
                provider: "airtable",
                operationId: "listRecords",
                validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                errorCases: [],
                filterableData: {
                    records: [
                        {
                            id: "rec1",
                            fields: { Name: "Alice", Status: "Active" },
                            _views: ["Grid view"]
                        },
                        {
                            id: "rec2",
                            fields: { Name: "Bob", Status: "Inactive" },
                            _views: ["Grid view", "Kanban"]
                        },
                        {
                            id: "rec3",
                            fields: { Name: "Charlie", Status: "Active" },
                            _views: ["Kanban"]
                        },
                        {
                            id: "rec4",
                            fields: { Name: "Alice", Status: "Pending" },
                            _views: ["Grid view"]
                        }
                    ],
                    recordsField: "records",
                    offsetField: "offset",
                    defaultPageSize: 100,
                    maxPageSize: 1000,
                    filterConfig: { type: "airtable" }
                }
            });
        });

        it("returns all records when no filters", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {});

            const data = response?.data as { records: unknown[] };
            expect(data.records).toHaveLength(4);
        });

        it("filters by view", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                view: "Kanban"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            expect(data.records).toHaveLength(2);
            expect(data.records.map((r) => r.id)).toEqual(["rec2", "rec3"]);
        });

        it("filters by formula - equality", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                filterByFormula: "{Status} = 'Active'"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            expect(data.records).toHaveLength(2);
            expect(data.records.map((r) => r.id)).toEqual(["rec1", "rec3"]);
        });

        it("filters by formula - NOT", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                filterByFormula: "NOT({Status} = 'Active')"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            // NOT({Status} = 'Active') should return records where Status != 'Active'
            expect(data.records).toHaveLength(2);
            expect(data.records.map((r) => r.id)).toEqual(["rec2", "rec4"]);
        });

        it("filters by formula - FIND", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                filterByFormula: "FIND('lic', {Name}) > 0"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            expect(data.records).toHaveLength(2); // Alice appears twice
        });

        it("combines view and formula filters", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                view: "Grid view",
                filterByFormula: "{Status} = 'Active'"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            expect(data.records).toHaveLength(1);
            expect(data.records[0].id).toBe("rec1");
        });

        it("strips internal metadata fields from response", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {});

            const data = response?.data as { records: Array<Record<string, unknown>> };
            for (const record of data.records) {
                expect(record._views).toBeUndefined();
                expect(Object.keys(record).every((k) => !k.startsWith("_"))).toBe(true);
            }
        });
    });

    describe("filterable data - HubSpot style", () => {
        beforeEach(() => {
            fixtureRegistry.register({
                provider: "hubspot",
                operationId: "searchContacts",
                validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                errorCases: [],
                filterableData: {
                    records: [
                        {
                            id: "1",
                            properties: { email: "alice@example.com", company: "Acme", score: 80 }
                        },
                        {
                            id: "2",
                            properties: { email: "bob@test.com", company: "Tech Corp", score: 60 }
                        },
                        {
                            id: "3",
                            properties: { email: "charlie@example.com", company: "Acme", score: 90 }
                        }
                    ],
                    recordsField: "results",
                    defaultPageSize: 100,
                    maxPageSize: 1000,
                    filterConfig: { type: "hubspot" }
                }
            });
        });

        it("filters by EQ operator", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "company", operator: "EQ", value: "Acme" }]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(2);
            expect(data.results.map((r) => r.id)).toEqual(["1", "3"]);
        });

        it("filters by NEQ operator", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "company", operator: "NEQ", value: "Acme" }]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(1);
            expect(data.results[0].id).toBe("2");
        });

        it("filters by CONTAINS_TOKEN operator", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [
                            { propertyName: "email", operator: "CONTAINS_TOKEN", value: "example" }
                        ]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(2);
        });

        it("ANDs filters within a group", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [
                            { propertyName: "company", operator: "EQ", value: "Acme" },
                            { propertyName: "email", operator: "CONTAINS_TOKEN", value: "alice" }
                        ]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(1);
            expect(data.results[0].id).toBe("1");
        });

        it("ORs filter groups", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "company", operator: "EQ", value: "Acme" }]
                    },
                    {
                        filters: [{ propertyName: "company", operator: "EQ", value: "Tech Corp" }]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(3);
        });

        it("filters by GT operator", async () => {
            const response = await service.getSandboxResponse("hubspot", "searchContacts", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "score", operator: "GT", value: 70 }]
                    }
                ]
            });

            const data = response?.data as { results: Array<{ id: string }> };
            expect(data.results).toHaveLength(2);
            expect(data.results.map((r) => r.id)).toEqual(["1", "3"]);
        });
    });

    describe("pagination", () => {
        beforeEach(() => {
            const records = Array.from({ length: 25 }, (_, i) => ({
                id: `rec${String(i + 1).padStart(3, "0")}`,
                fields: { name: `Item ${i + 1}` }
            }));

            fixtureRegistry.register({
                provider: "airtable",
                operationId: "listRecords",
                validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                errorCases: [],
                filterableData: {
                    records,
                    recordsField: "records",
                    offsetField: "offset",
                    pageSizeParam: "pageSize",
                    offsetParam: "offset",
                    defaultPageSize: 10,
                    maxPageSize: 100,
                    filterConfig: { type: "airtable" }
                }
            });
        });

        it("paginates with default page size", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {});

            const data = response?.data as { records: unknown[]; offset?: string };
            expect(data.records).toHaveLength(10);
            expect(data.offset).toBeDefined();
        });

        it("respects custom page size", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                pageSize: 5
            });

            const data = response?.data as { records: unknown[] };
            expect(data.records).toHaveLength(5);
        });

        it("respects max page size", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                pageSize: 200
            });

            const data = response?.data as { records: unknown[] };
            expect(data.records).toHaveLength(25); // All records (less than max)
        });

        it("returns no offset when all records returned", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                pageSize: 100
            });

            const data = response?.data as { records: unknown[]; offset?: string };
            expect(data.records).toHaveLength(25);
            expect(data.offset).toBeUndefined();
        });

        it("handles numeric offset", async () => {
            const response = await service.getSandboxResponse("airtable", "listRecords", {
                pageSize: 10,
                offset: "10"
            });

            const data = response?.data as { records: Array<{ id: string }> };
            expect(data.records).toHaveLength(10);
            expect(data.records[0].id).toBe("rec011");
        });
    });

    describe("response interpolation", () => {
        it("interpolates param values", async () => {
            service.registerScenario({
                id: "interpolate-params",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        channel: "{{channel}}",
                        text: "{{text}}",
                        nested: {
                            value: "{{param.nested.key}}"
                        }
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#general",
                text: "Hello World",
                nested: { key: "nestedValue" }
            });

            expect(response?.data).toEqual({
                channel: "#general",
                text: "Hello World",
                nested: {
                    value: "nestedValue"
                }
            });
        });

        it("interpolates random strings", async () => {
            service.registerScenario({
                id: "interpolate-random",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        id: "{{random:10}}",
                        shortId: "{{random:5}}"
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});
            const data = response?.data as { id: string; shortId: string };

            expect(data.id).toHaveLength(10);
            expect(data.shortId).toHaveLength(5);
            expect(data.id).toMatch(/^[A-Za-z0-9]+$/);
        });

        it("interpolates timestamp", async () => {
            const before = Date.now();

            service.registerScenario({
                id: "interpolate-timestamp",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        ts: "{{timestamp}}"
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});
            const data = response?.data as { ts: string };
            const after = Date.now();

            const ts = parseInt(data.ts, 10);
            expect(ts).toBeGreaterThanOrEqual(before);
            expect(ts).toBeLessThanOrEqual(after);
        });

        it("interpolates ISO date", async () => {
            service.registerScenario({
                id: "interpolate-iso",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        createdAt: "{{iso}}"
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});
            const data = response?.data as { createdAt: string };

            expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
        });

        it("interpolates UUID", async () => {
            service.registerScenario({
                id: "interpolate-uuid",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        id: "{{uuid}}"
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});
            const data = response?.data as { id: string };

            // UUID v4 format
            expect(data.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });

        it("interpolates in arrays", async () => {
            service.registerScenario({
                id: "interpolate-array",
                provider: "slack",
                operation: "listChannels",
                response: {
                    success: true,
                    data: {
                        channels: [
                            { id: "{{random:8}}", name: "channel1" },
                            { id: "{{random:8}}", name: "channel2" }
                        ]
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "listChannels", {});
            const data = response?.data as { channels: Array<{ id: string }> };

            expect(data.channels[0].id).toHaveLength(8);
            expect(data.channels[1].id).toHaveLength(8);
            expect(data.channels[0].id).not.toBe(data.channels[1].id);
        });

        it("leaves unmatched patterns unchanged", async () => {
            service.registerScenario({
                id: "interpolate-unknown",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: {
                        unknown: "{{unknown_pattern}}",
                        missing: "{{missingParam}}"
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {});
            const data = response?.data as { unknown: string; missing: string };

            expect(data.unknown).toBe("{{unknown_pattern}}");
            expect(data.missing).toBe("{{missingParam}}");
        });
    });

    describe("error scenarios", () => {
        it("returns error response from scenario", async () => {
            service.registerScenario({
                id: "error-scenario",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#nonexistent" },
                response: {
                    success: false,
                    error: {
                        type: "not_found",
                        message: "channel_not_found",
                        retryable: false
                    }
                }
            });

            const response = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#nonexistent"
            });

            expect(response?.success).toBe(false);
            expect(response?.error?.type).toBe("not_found");
            expect(response?.error?.message).toBe("channel_not_found");
        });

        it("matches error scenarios with specific params", async () => {
            service.registerScenario({
                id: "success",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { messageId: "123" }
                }
            });
            service.registerScenario({
                id: "rate-limit",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#busy" },
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Rate limit exceeded",
                        retryable: true
                    }
                }
            });

            const normalResponse = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#general"
            });
            const rateLimitResponse = await service.getSandboxResponse("slack", "sendMessage", {
                channel: "#busy"
            });

            expect(normalResponse?.success).toBe(true);
            expect(rateLimitResponse?.success).toBe(false);
            expect(rateLimitResponse?.error?.type).toBe("rate_limit");
        });
    });
});
