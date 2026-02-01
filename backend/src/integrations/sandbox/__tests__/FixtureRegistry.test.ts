/**
 * FixtureRegistry Unit Tests
 *
 * Tests for fixture registration, retrieval, and provider-based queries.
 */

import { FixtureRegistry } from "../FixtureRegistry";
import type { TestFixture } from "../types";

describe("FixtureRegistry", () => {
    let registry: FixtureRegistry;

    beforeEach(() => {
        registry = new FixtureRegistry();
    });

    describe("register", () => {
        it("registers a fixture", () => {
            const fixture: TestFixture<{ channel: string }, { messageId: string }> = {
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    {
                        name: "basic",
                        input: { channel: "#general" },
                        expectedOutput: { messageId: "123" }
                    }
                ],
                errorCases: []
            };

            registry.register(fixture);

            expect(registry.has("slack", "sendMessage")).toBe(true);
        });

        it("overwrites existing fixture with same key", () => {
            const fixture1: TestFixture = {
                provider: "slack",
                operationId: "sendMessage",
                validCases: [{ name: "case1", input: {}, expectedOutput: { v: 1 } }],
                errorCases: []
            };

            const fixture2: TestFixture = {
                provider: "slack",
                operationId: "sendMessage",
                validCases: [{ name: "case2", input: {}, expectedOutput: { v: 2 } }],
                errorCases: []
            };

            registry.register(fixture1);
            registry.register(fixture2);

            const retrieved = registry.get("slack", "sendMessage");
            expect(retrieved?.validCases[0].name).toBe("case2");
        });
    });

    describe("registerAll", () => {
        it("registers multiple fixtures at once", () => {
            const fixtures: TestFixture[] = [
                {
                    provider: "slack",
                    operationId: "sendMessage",
                    validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                    errorCases: []
                },
                {
                    provider: "slack",
                    operationId: "listChannels",
                    validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                    errorCases: []
                },
                {
                    provider: "github",
                    operationId: "createIssue",
                    validCases: [{ name: "basic", input: {}, expectedOutput: {} }],
                    errorCases: []
                }
            ];

            registry.registerAll(fixtures);

            expect(registry.has("slack", "sendMessage")).toBe(true);
            expect(registry.has("slack", "listChannels")).toBe(true);
            expect(registry.has("github", "createIssue")).toBe(true);
        });
    });

    describe("get", () => {
        it("returns fixture for existing operation", () => {
            const fixture: TestFixture = {
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    {
                        name: "basic",
                        input: { channel: "#general" },
                        expectedOutput: { messageId: "123" }
                    }
                ],
                errorCases: []
            };

            registry.register(fixture);
            const retrieved = registry.get("slack", "sendMessage");

            expect(retrieved).toBeDefined();
            expect(retrieved?.provider).toBe("slack");
            expect(retrieved?.operationId).toBe("sendMessage");
        });

        it("returns undefined for non-existent operation", () => {
            const retrieved = registry.get("slack", "unknownOperation");
            expect(retrieved).toBeUndefined();
        });

        it("returns undefined for non-existent provider", () => {
            const retrieved = registry.get("unknownProvider", "sendMessage");
            expect(retrieved).toBeUndefined();
        });
    });

    describe("has", () => {
        it("returns true for existing fixture", () => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [],
                errorCases: []
            });

            expect(registry.has("slack", "sendMessage")).toBe(true);
        });

        it("returns false for non-existent fixture", () => {
            expect(registry.has("slack", "sendMessage")).toBe(false);
        });
    });

    describe("getByProvider", () => {
        it("returns all fixtures for a provider", () => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "slack",
                operationId: "listChannels",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "github",
                operationId: "createIssue",
                validCases: [],
                errorCases: []
            });

            const slackFixtures = registry.getByProvider("slack");

            expect(slackFixtures).toHaveLength(2);
            expect(slackFixtures.map((f) => f.operationId)).toContain("sendMessage");
            expect(slackFixtures.map((f) => f.operationId)).toContain("listChannels");
        });

        it("returns empty array for non-existent provider", () => {
            const fixtures = registry.getByProvider("unknownProvider");
            expect(fixtures).toEqual([]);
        });

        it("returns empty array when no fixtures registered", () => {
            const fixtures = registry.getByProvider("slack");
            expect(fixtures).toEqual([]);
        });
    });

    describe("getTestCase", () => {
        beforeEach(() => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    { name: "basic", input: { channel: "#general" }, expectedOutput: { id: "1" } },
                    {
                        name: "with_thread",
                        input: { channel: "#general", thread_ts: "123" },
                        expectedOutput: { id: "2" }
                    }
                ],
                errorCases: [
                    {
                        name: "channel_not_found",
                        input: { channel: "#nonexistent" },
                        expectedError: {
                            type: "not_found",
                            message: "channel_not_found",
                            retryable: false
                        }
                    }
                ]
            });
        });

        it("finds valid case by name", () => {
            const testCase = registry.getTestCase("slack", "sendMessage", "basic");

            expect(testCase).toBeDefined();
            expect(testCase?.name).toBe("basic");
            expect(testCase?.expectedOutput).toEqual({ id: "1" });
        });

        it("finds error case by name", () => {
            const testCase = registry.getTestCase("slack", "sendMessage", "channel_not_found");

            expect(testCase).toBeDefined();
            expect(testCase?.name).toBe("channel_not_found");
            expect(testCase?.expectedError?.type).toBe("not_found");
        });

        it("returns undefined for non-existent case name", () => {
            const testCase = registry.getTestCase("slack", "sendMessage", "nonexistent");
            expect(testCase).toBeUndefined();
        });

        it("returns undefined for non-existent fixture", () => {
            const testCase = registry.getTestCase("slack", "unknownOp", "basic");
            expect(testCase).toBeUndefined();
        });
    });

    describe("getProviders", () => {
        it("returns all unique provider names", () => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "slack",
                operationId: "listChannels",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "github",
                operationId: "createIssue",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "airtable",
                operationId: "listRecords",
                validCases: [],
                errorCases: []
            });

            const providers = registry.getProviders();

            expect(providers).toHaveLength(3);
            expect(providers).toContain("slack");
            expect(providers).toContain("github");
            expect(providers).toContain("airtable");
        });

        it("returns empty array when no fixtures registered", () => {
            const providers = registry.getProviders();
            expect(providers).toEqual([]);
        });
    });

    describe("getCoverage", () => {
        it("returns fixture count per provider", () => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "slack",
                operationId: "listChannels",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "slack",
                operationId: "getUser",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "github",
                operationId: "createIssue",
                validCases: [],
                errorCases: []
            });

            const coverage = registry.getCoverage();

            expect(coverage).toEqual({
                slack: 3,
                github: 1
            });
        });

        it("returns empty object when no fixtures registered", () => {
            const coverage = registry.getCoverage();
            expect(coverage).toEqual({});
        });
    });

    describe("clear", () => {
        it("removes all fixtures", () => {
            registry.register({
                provider: "slack",
                operationId: "sendMessage",
                validCases: [],
                errorCases: []
            });
            registry.register({
                provider: "github",
                operationId: "createIssue",
                validCases: [],
                errorCases: []
            });

            expect(registry.getProviders()).toHaveLength(2);

            registry.clear();

            expect(registry.getProviders()).toHaveLength(0);
            expect(registry.has("slack", "sendMessage")).toBe(false);
            expect(registry.has("github", "createIssue")).toBe(false);
        });
    });

    describe("fixture with edge cases and filterable data", () => {
        it("stores and retrieves fixture with edgeCases", () => {
            const fixture: TestFixture = {
                provider: "airtable",
                operationId: "listRecords",
                validCases: [{ name: "basic", input: {}, expectedOutput: { records: [] } }],
                errorCases: [],
                edgeCases: [
                    {
                        name: "empty_table",
                        input: { tableId: "empty" },
                        expectedOutput: { records: [] }
                    },
                    {
                        name: "max_records",
                        input: { pageSize: 100 },
                        expectedOutput: { records: [] }
                    }
                ]
            };

            registry.register(fixture);
            const retrieved = registry.get("airtable", "listRecords");

            expect(retrieved?.edgeCases).toHaveLength(2);
            expect(retrieved?.edgeCases?.[0].name).toBe("empty_table");
        });

        it("stores and retrieves fixture with filterableData", () => {
            const fixture: TestFixture = {
                provider: "airtable",
                operationId: "listRecords",
                validCases: [{ name: "basic", input: {}, expectedOutput: { records: [] } }],
                errorCases: [],
                filterableData: {
                    records: [
                        { id: "rec1", fields: { Name: "Alice" } },
                        { id: "rec2", fields: { Name: "Bob" } }
                    ],
                    recordsField: "records",
                    defaultPageSize: 100,
                    maxPageSize: 1000,
                    filterConfig: { type: "airtable" }
                }
            };

            registry.register(fixture);
            const retrieved = registry.get("airtable", "listRecords");

            expect(retrieved?.filterableData).toBeDefined();
            expect(retrieved?.filterableData?.records).toHaveLength(2);
            expect(retrieved?.filterableData?.filterConfig?.type).toBe("airtable");
        });
    });

    describe("typed fixtures", () => {
        it("maintains type information for strongly typed fixtures", () => {
            interface SendMessageInput {
                channel: string;
                text: string;
            }

            interface SendMessageOutput {
                messageId: string;
                timestamp: string;
            }

            const fixture: TestFixture<SendMessageInput, SendMessageOutput> = {
                provider: "slack",
                operationId: "sendMessage",
                validCases: [
                    {
                        name: "basic",
                        input: { channel: "#general", text: "Hello" },
                        expectedOutput: { messageId: "123", timestamp: "1234567890.123456" }
                    }
                ],
                errorCases: []
            };

            registry.register(fixture);
            const retrieved = registry.get("slack", "sendMessage");

            // Retrieved fixture has unknown types, but structure is preserved
            expect(retrieved?.validCases[0].input).toEqual({
                channel: "#general",
                text: "Hello"
            });
            expect(retrieved?.validCases[0].expectedOutput).toEqual({
                messageId: "123",
                timestamp: "1234567890.123456"
            });
        });
    });
});
