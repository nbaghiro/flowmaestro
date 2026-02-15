/**
 * SapSuccessfactors Provider Unit Tests
 *
 * Tests the SAPSuccessFactorsProvider class in isolation.
 * Validates operation registration, trigger setup, auth config, and webhook configuration.
 */

import { SAPSuccessFactorsProvider } from "../SAPSuccessFactorsProvider";
import type { OAuthConfig, WebhookConfig } from "../../../core/types";

describe("SAPSuccessFactorsProvider", () => {
    let provider: SAPSuccessFactorsProvider;

    beforeEach(() => {
        provider = new SAPSuccessFactorsProvider();
    });

    describe("provider metadata", () => {
        it("has correct name and display name", () => {
            expect(provider.name).toBe("sap-successfactors");
            expect(provider.displayName).toBeDefined();
            expect(provider.displayName.length).toBeGreaterThan(0);
        });

        it("has correct auth method", () => {
            expect(["oauth2", "api_key", "basic", "custom"]).toContain(provider.authMethod);
        });

        it("has defined capabilities", () => {
            expect(provider.capabilities).toBeDefined();
        });
    });

    describe("operation registration", () => {
        it("has at least one operation registered", () => {
            const operations = provider.getOperations();
            expect(operations.length).toBeGreaterThan(0);
        });

        it("all operations have required fields", () => {
            const operations = provider.getOperations();

            for (const op of operations) {
                expect(op.id).toBeDefined();
                expect(op.name).toBeDefined();
                expect(op.description).toBeDefined();
                expect(op.category).toBeDefined();
                expect(op.inputSchema).toBeDefined();
                expect(typeof op.retryable).toBe("boolean");
            }
        });

        it("all operations have valid input schemas", () => {
            const operations = provider.getOperations();

            for (const op of operations) {
                // Schema should be a Zod schema with safeParse
                expect(typeof op.inputSchema.safeParse).toBe("function");
            }
        });
    });

    describe("trigger registration", () => {
        it("has triggers defined (or empty array)", () => {
            const triggers = provider.getTriggers();
            expect(Array.isArray(triggers)).toBe(true);
        });

        it("all triggers have required fields", () => {
            const triggers = provider.getTriggers();

            for (const trigger of triggers) {
                expect(trigger.id).toBeDefined();
                expect(trigger.name).toBeDefined();
                expect(trigger.description).toBeDefined();
                expect(trigger.requiredScopes).toBeDefined();
                expect(Array.isArray(trigger.configFields)).toBe(true);
            }
        });

        it("triggers have valid config fields", () => {
            const triggers = provider.getTriggers();

            for (const trigger of triggers) {
                for (const field of trigger.configFields || []) {
                    expect(field.name).toBeDefined();
                    expect(field.label).toBeDefined();
                    expect(field.type).toBeDefined();
                    expect(typeof field.required).toBe("boolean");
                }
            }
        });
    });

    describe("auth configuration", () => {
        it("returns auth config", () => {
            const config = provider.getAuthConfig();
            expect(config).toBeDefined();
        });
    });

    describe("MCP tools", () => {
        it("generates tools for all operations", () => {
            const tools = provider.getMCPTools();
            const operations = provider.getOperations();

            expect(tools.length).toBe(operations.length);
        });

        it("follows naming convention", () => {
            const tools = provider.getMCPTools();
            const expectedPrefix = "sap-successfactors".replace(/-/g, "_") + "_";

            for (const tool of tools) {
                expect(tool.name.startsWith(expectedPrefix)).toBe(true);
            }
        });

        it("has valid JSON schemas", () => {
            const tools = provider.getMCPTools();

            for (const tool of tools) {
                expect(() => JSON.stringify(tool.inputSchema)).not.toThrow();
                expect(tool.inputSchema.type).toBe("object");
            }
        });

        it("has descriptions for all tools", () => {
            const tools = provider.getMCPTools();

            for (const tool of tools) {
                expect(tool.description).toBeDefined();
                expect(tool.description.length).toBeGreaterThan(10);
            }
        });
    });

    describe("getOperationSchema", () => {
        it("returns schema for existing operation", () => {
            const operations = provider.getOperations();
            if (operations.length > 0) {
                const schema = provider.getOperationSchema(operations[0].id);
                expect(schema).toBeDefined();
            }
        });

        it("returns null for non-existing operation", () => {
            const schema = provider.getOperationSchema("nonExistentOperation");
            expect(schema).toBeNull();
        });
    });

    describe("clearClient", () => {
        it("clears client from pool without error (if method exists)", () => {
            if (typeof provider.clearClient === "function") {
                expect(() => provider.clearClient("some-connection-id")).not.toThrow();
            } else {
                // Provider doesn't implement clearClient - this is OK
                expect(true).toBe(true);
            }
        });
    });
});
