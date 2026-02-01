/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * BaseProvider Unit Tests
 *
 * Tests for the abstract base provider class functionality including
 * operation registration, parameter validation, and webhook verification.
 */

import { z } from "zod";
import { BaseProvider } from "../BaseProvider";
import type { ConnectionWithData, ConnectionMethod } from "../../../storage/models/Connection";
import type {
    OperationDefinition,
    OperationResult,
    MCPTool,
    AuthConfig,
    ProviderCapabilities,
    ExecutionContext,
    TriggerDefinition,
    WebhookConfig,
    WebhookRequestData
} from "../types";

// Concrete implementation for testing
class TestProvider extends BaseProvider {
    readonly name = "test-provider";
    readonly displayName = "Test Provider";
    readonly authMethod: ConnectionMethod = "oauth2";
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        prefersMCP: false
    };

    constructor() {
        super();
        this.initializeOperations();
    }

    private initializeOperations(): void {
        this.registerOperation({
            id: "sendMessage",
            name: "Send Message",
            description: "Send a message",
            category: "messaging",
            inputSchema: z.object({
                channel: z.string().min(1),
                text: z.string().min(1),
                thread_ts: z.string().optional()
            }),
            retryable: true
        });

        this.registerOperation({
            id: "listChannels",
            name: "List Channels",
            description: "List all channels",
            category: "channels",
            inputSchema: z.object({
                limit: z.number().min(1).max(1000).optional().default(100),
                excludeArchived: z.boolean().optional()
            }),
            retryable: true
        });
    }

    getAuthConfig(): AuthConfig {
        return {
            authUrl: "https://test.example.com/oauth/authorize",
            tokenUrl: "https://test.example.com/oauth/token",
            scopes: ["read", "write"],
            clientId: "test-client-id",
            clientSecret: "test-client-secret",
            redirectUri: "https://test.example.com/callback"
        };
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        _connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate params (exposed for testing)
        const validated = this.validateParams(operationId, params);
        return {
            success: true,
            data: { operationId, params: validated }
        };
    }

    getMCPTools(): MCPTool[] {
        return [];
    }

    async executeMCPTool(
        _toolName: string,
        _params: Record<string, unknown>,
        _connection: ConnectionWithData
    ): Promise<unknown> {
        return {};
    }

    // Expose protected methods for testing
    public testValidateParams<T>(operationId: string, params: Record<string, unknown>): T {
        return this.validateParams<T>(operationId, params);
    }

    public testGetOperation(operationId: string): OperationDefinition | null {
        return this.getOperation(operationId);
    }

    public testRegisterTrigger(trigger: TriggerDefinition): void {
        this.registerTrigger(trigger);
    }

    public testSetWebhookConfig(config: WebhookConfig): void {
        this.setWebhookConfig(config);
    }

    public testGetHeader(
        headers: Record<string, string | string[] | undefined>,
        name: string
    ): string | undefined {
        return this.getHeader(headers, name);
    }

    public testGetBodyString(request: WebhookRequestData): string {
        return this.getBodyString(request);
    }

    public testTimingSafeEqual(a: string, b: string): boolean {
        return this.timingSafeEqual(a, b);
    }

    public testVerifyHmacSha256(signature: string, body: string, secret: string) {
        return this.verifyHmacSha256(signature, body, secret);
    }

    public testVerifyHmacSha1(signature: string, body: string, secret: string) {
        return this.verifyHmacSha1(signature, body, secret);
    }

    public testVerifyBearerToken(token: string, secret: string) {
        return this.verifyBearerToken(token, secret);
    }
}

describe("BaseProvider", () => {
    let provider: TestProvider;

    beforeEach(() => {
        provider = new TestProvider();
    });

    describe("registerOperation / getOperations / getOperation", () => {
        it("registers operations in constructor", () => {
            const operations = provider.getOperations();
            expect(operations).toHaveLength(2);
            expect(operations.map((op) => op.id)).toContain("sendMessage");
            expect(operations.map((op) => op.id)).toContain("listChannels");
        });

        it("retrieves operation by ID", () => {
            const operation = provider.testGetOperation("sendMessage");
            expect(operation).toBeDefined();
            expect(operation?.id).toBe("sendMessage");
            expect(operation?.name).toBe("Send Message");
        });

        it("returns null for non-existent operation", () => {
            const operation = provider.testGetOperation("unknownOperation");
            expect(operation).toBeNull();
        });
    });

    describe("getOperationSchema", () => {
        it("returns schema for existing operation", () => {
            const schema = provider.getOperationSchema("sendMessage");
            expect(schema).toBeDefined();
        });

        it("returns null for non-existent operation", () => {
            const schema = provider.getOperationSchema("unknownOperation");
            expect(schema).toBeNull();
        });
    });

    describe("validateParams", () => {
        it("validates and returns params for valid input", () => {
            const params = { channel: "#general", text: "Hello" };
            const validated = provider.testValidateParams("sendMessage", params);
            expect(validated).toEqual(params);
        });

        it("applies defaults from schema", () => {
            const params = {};
            const validated = provider.testValidateParams<{ limit: number }>(
                "listChannels",
                params
            );
            expect(validated.limit).toBe(100);
        });

        it("throws error for invalid params", () => {
            const params = { channel: "", text: "Hello" }; // channel is empty
            expect(() => provider.testValidateParams("sendMessage", params)).toThrow(
                /Invalid parameters for sendMessage/
            );
        });

        it("throws error for missing required params", () => {
            const params = { channel: "#general" }; // missing text
            expect(() => provider.testValidateParams("sendMessage", params)).toThrow(
                /Invalid parameters for sendMessage/
            );
        });

        it("throws error for unknown operation", () => {
            expect(() => provider.testValidateParams("unknownOp", {})).toThrow(
                "Operation unknownOp not found in provider test-provider"
            );
        });

        it("passes optional params through", () => {
            const params = { channel: "#general", text: "Hello", thread_ts: "123.456" };
            const validated = provider.testValidateParams("sendMessage", params);
            expect(validated).toEqual(params);
        });
    });

    describe("trigger registration", () => {
        it("registers triggers", () => {
            provider.testRegisterTrigger({
                id: "message_posted",
                name: "Message Posted",
                description: "Triggered when a new message is posted",
                configFields: [
                    {
                        name: "channel",
                        label: "Channel",
                        type: "text",
                        required: true
                    }
                ]
            });

            const triggers = provider.getTriggers();
            expect(triggers).toHaveLength(1);
            expect(triggers[0].id).toBe("message_posted");
        });

        it("registers multiple triggers", () => {
            provider.testRegisterTrigger({
                id: "trigger1",
                name: "Trigger 1",
                description: "First trigger",
                configFields: []
            });
            provider.testRegisterTrigger({
                id: "trigger2",
                name: "Trigger 2",
                description: "Second trigger",
                configFields: []
            });

            const triggers = provider.getTriggers();
            expect(triggers).toHaveLength(2);
        });
    });

    describe("webhook configuration", () => {
        it("sets and retrieves webhook config", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });

            const config = provider.getWebhookConfig();
            expect(config).toEqual({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });
        });

        it("returns null when no config set", () => {
            const config = provider.getWebhookConfig();
            expect(config).toBeNull();
        });
    });

    describe("verifyWebhookSignature", () => {
        it("returns valid when no webhook config", () => {
            const result = provider.verifyWebhookSignature("secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(result.valid).toBe(true);
        });

        it("returns valid for signatureType 'none'", () => {
            provider.testSetWebhookConfig({
                setupType: "manual",
                signatureType: "none"
            });

            const result = provider.verifyWebhookSignature("secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(result.valid).toBe(true);
        });

        it("returns valid when no signature header configured", () => {
            provider.testSetWebhookConfig({
                setupType: "manual",
                signatureType: "hmac_sha256"
                // No signatureHeader
            });

            const result = provider.verifyWebhookSignature("secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(result.valid).toBe(true);
        });

        it("returns invalid when signature header missing", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });

            const result = provider.verifyWebhookSignature("secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Missing signature header");
        });

        it("verifies hmac_sha256 signature", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });

            // Pre-computed HMAC-SHA256 of "test body" with secret "secret123"
            const crypto = require("crypto");
            const hmac = crypto.createHmac("sha256", "secret123");
            hmac.update("test body", "utf-8");
            const signature = hmac.digest("hex");

            const result = provider.verifyWebhookSignature("secret123", {
                headers: { "X-Signature": signature },
                body: Buffer.from("test body"),
                rawBody: Buffer.from("test body")
            });
            expect(result.valid).toBe(true);
        });

        it("verifies hmac_sha256 with sha256= prefix", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });

            const crypto = require("crypto");
            const hmac = crypto.createHmac("sha256", "secret123");
            hmac.update("test body", "utf-8");
            const signature = "sha256=" + hmac.digest("hex");

            const result = provider.verifyWebhookSignature("secret123", {
                headers: { "X-Signature": signature },
                body: Buffer.from("test body"),
                rawBody: Buffer.from("test body")
            });
            expect(result.valid).toBe(true);
        });

        it("verifies hmac_sha1 signature", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha1",
                signatureHeader: "X-Hub-Signature"
            });

            const crypto = require("crypto");
            const hmac = crypto.createHmac("sha1", "secret123");
            hmac.update("test body", "utf-8");
            const signature = hmac.digest("hex");

            const result = provider.verifyWebhookSignature("secret123", {
                headers: { "X-Hub-Signature": signature },
                body: Buffer.from("test body"),
                rawBody: Buffer.from("test body")
            });
            expect(result.valid).toBe(true);
        });

        it("verifies bearer token", () => {
            provider.testSetWebhookConfig({
                setupType: "manual",
                signatureType: "bearer_token",
                signatureHeader: "Authorization"
            });

            const result = provider.verifyWebhookSignature("my-secret-token", {
                headers: { Authorization: "Bearer my-secret-token" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(result.valid).toBe(true);
        });

        it("returns invalid for mismatched signature", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                signatureHeader: "X-Signature"
            });

            const result = provider.verifyWebhookSignature("secret123", {
                headers: { "X-Signature": "invalid-signature" },
                body: Buffer.from("test body"),
                rawBody: Buffer.from("test body")
            });
            expect(result.valid).toBe(false);
        });
    });

    describe("extractEventType", () => {
        it("returns undefined when no webhook config", () => {
            const eventType = provider.extractEventType({
                headers: { "X-Event-Type": "message" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(eventType).toBeUndefined();
        });

        it("returns undefined when no eventHeader configured", () => {
            provider.testSetWebhookConfig({
                setupType: "manual",
                signatureType: "none"
            });

            const eventType = provider.extractEventType({
                headers: { "X-Event-Type": "message" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(eventType).toBeUndefined();
        });

        it("extracts event type from header", () => {
            provider.testSetWebhookConfig({
                setupType: "automatic",
                signatureType: "hmac_sha256",
                eventHeader: "X-Event-Type"
            });

            const eventType = provider.extractEventType({
                headers: { "X-Event-Type": "message_posted" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });
            expect(eventType).toBe("message_posted");
        });
    });

    describe("helper methods", () => {
        describe("getHeader", () => {
            it("gets header with exact case", () => {
                const headers = { "Content-Type": "application/json" };
                const value = provider.testGetHeader(headers, "Content-Type");
                expect(value).toBe("application/json");
            });

            it("gets header case-insensitively", () => {
                const headers = { "content-type": "application/json" };
                const value = provider.testGetHeader(headers, "Content-Type");
                expect(value).toBe("application/json");
            });

            it("returns first value for array headers", () => {
                const headers = { Accept: ["application/json", "text/html"] };
                const value = provider.testGetHeader(headers, "Accept");
                expect(value).toBe("application/json");
            });

            it("returns undefined for missing header", () => {
                const headers = {};
                const value = provider.testGetHeader(headers, "X-Missing");
                expect(value).toBeUndefined();
            });
        });

        describe("getBodyString", () => {
            it("returns rawBody as string when available", () => {
                const body = provider.testGetBodyString({
                    headers: {},
                    body: Buffer.from("body"),
                    rawBody: Buffer.from("rawBody")
                });
                expect(body).toBe("rawBody");
            });

            it("returns body as string when rawBody not available", () => {
                const body = provider.testGetBodyString({
                    headers: {},
                    body: "string body"
                } as WebhookRequestData);
                expect(body).toBe("string body");
            });

            it("converts Buffer body to string", () => {
                const body = provider.testGetBodyString({
                    headers: {},
                    body: Buffer.from("buffer body")
                } as WebhookRequestData);
                expect(body).toBe("buffer body");
            });
        });

        describe("timingSafeEqual", () => {
            it("returns true for equal strings", () => {
                expect(provider.testTimingSafeEqual("hello", "hello")).toBe(true);
            });

            it("returns false for different strings", () => {
                expect(provider.testTimingSafeEqual("hello", "world")).toBe(false);
            });

            it("returns false for different length strings", () => {
                expect(provider.testTimingSafeEqual("short", "longer")).toBe(false);
            });
        });

        describe("verifyHmacSha256", () => {
            it("verifies correct signature", () => {
                const crypto = require("crypto");
                const hmac = crypto.createHmac("sha256", "secret");
                hmac.update("body", "utf-8");
                const signature = hmac.digest("hex");

                const result = provider.testVerifyHmacSha256(signature, "body", "secret");
                expect(result.valid).toBe(true);
            });

            it("handles sha256= prefix", () => {
                const crypto = require("crypto");
                const hmac = crypto.createHmac("sha256", "secret");
                hmac.update("body", "utf-8");
                const signature = "sha256=" + hmac.digest("hex");

                const result = provider.testVerifyHmacSha256(signature, "body", "secret");
                expect(result.valid).toBe(true);
            });

            it("rejects invalid signature", () => {
                const result = provider.testVerifyHmacSha256("invalid", "body", "secret");
                expect(result.valid).toBe(false);
            });
        });

        describe("verifyHmacSha1", () => {
            it("verifies correct signature", () => {
                const crypto = require("crypto");
                const hmac = crypto.createHmac("sha1", "secret");
                hmac.update("body", "utf-8");
                const signature = hmac.digest("hex");

                const result = provider.testVerifyHmacSha1(signature, "body", "secret");
                expect(result.valid).toBe(true);
            });

            it("handles sha1= prefix", () => {
                const crypto = require("crypto");
                const hmac = crypto.createHmac("sha1", "secret");
                hmac.update("body", "utf-8");
                const signature = "sha1=" + hmac.digest("hex");

                const result = provider.testVerifyHmacSha1(signature, "body", "secret");
                expect(result.valid).toBe(true);
            });
        });

        describe("verifyBearerToken", () => {
            it("verifies correct token", () => {
                const result = provider.testVerifyBearerToken("my-token", "my-token");
                expect(result.valid).toBe(true);
            });

            it("handles Bearer prefix", () => {
                const result = provider.testVerifyBearerToken("Bearer my-token", "my-token");
                expect(result.valid).toBe(true);
            });

            it("rejects invalid token", () => {
                const result = provider.testVerifyBearerToken("wrong-token", "my-token");
                expect(result.valid).toBe(false);
            });
        });
    });
});
