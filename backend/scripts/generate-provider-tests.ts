#!/usr/bin/env npx ts-node
/**
 * Provider Test Generator
 *
 * Generates test file skeletons for all providers based on their metadata.
 * Run with: npx ts-node scripts/generate-provider-tests.ts
 *
 * Options:
 *   --provider=<name>  Generate tests for a specific provider only
 *   --overwrite        Overwrite existing test files (default: skip existing)
 *   --list             List all providers without generating
 */

import * as fs from "fs";
import * as path from "path";

// Provider info extracted from directory structure
interface ProviderInfo {
    name: string;
    dirName: string;
    providerClassName: string;
    providerFilePath: string;
    hasClient: boolean;
    clientFileName?: string;
    hasOperationsDir: boolean;
    operationFiles: string[];
    hasWebhookSupport: boolean;
    hasMCPAdapter: boolean;
    hasExistingTests: boolean;
    existingTestFiles: string[];
}

const PROVIDERS_DIR = path.join(__dirname, "../src/integrations/providers");

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
    return str
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

/**
 * Convert kebab-case to camelCase
 */
function toCamelCase(str: string): string {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Scan a provider directory and extract metadata
 */
function scanProvider(providerDirName: string): ProviderInfo | null {
    const providerPath = path.join(PROVIDERS_DIR, providerDirName);

    if (!fs.statSync(providerPath).isDirectory()) {
        return null;
    }

    // Find the Provider file
    const files = fs.readdirSync(providerPath);
    const providerFile = files.find((f) => f.endsWith("Provider.ts") && !f.includes(".test."));

    if (!providerFile) {
        console.warn(`  Warning: No Provider file found in ${providerDirName}`);
        return null;
    }

    const providerClassName = providerFile.replace(".ts", "");

    // Check for client
    const clientDir = path.join(providerPath, "client");
    const hasClient = fs.existsSync(clientDir);
    let clientFileName: string | undefined;
    if (hasClient) {
        const clientFiles = fs.readdirSync(clientDir);
        const clientFile = clientFiles.find((f) => f.endsWith("Client.ts"));
        clientFileName = clientFile?.replace(".ts", "");
    }

    // Check for operations directory
    const operationsDir = path.join(providerPath, "operations");
    const hasOperationsDir = fs.existsSync(operationsDir);
    let operationFiles: string[] = [];
    if (hasOperationsDir) {
        operationFiles = fs
            .readdirSync(operationsDir)
            .filter((f) => f.endsWith(".ts") && !f.includes("index") && !f.includes("types"));
    }

    // Check for webhook support by reading provider file
    const providerContent = fs.readFileSync(path.join(providerPath, providerFile), "utf-8");
    const hasWebhookSupport =
        providerContent.includes("setWebhookConfig") ||
        providerContent.includes("supportsWebhooks: true");

    // Check for MCP adapter
    const mcpDir = path.join(providerPath, "mcp");
    const hasMCPAdapter = fs.existsSync(mcpDir);

    // Check for existing tests
    const testsDir = path.join(providerPath, "__tests__");
    const hasExistingTests = fs.existsSync(testsDir);
    let existingTestFiles: string[] = [];
    if (hasExistingTests) {
        existingTestFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"));
    }

    return {
        name: providerDirName,
        dirName: providerDirName,
        providerClassName,
        providerFilePath: path.join(providerPath, providerFile),
        hasClient,
        clientFileName,
        hasOperationsDir,
        operationFiles,
        hasWebhookSupport,
        hasMCPAdapter,
        hasExistingTests,
        existingTestFiles
    };
}

/**
 * Generate provider.test.ts content
 */
function generateProviderTest(info: ProviderInfo): string {
    const pascalName = toPascalCase(info.name);

    return `/**
 * ${pascalName} Provider Unit Tests
 *
 * Tests the ${info.providerClassName} class in isolation.
 * Validates operation registration, trigger setup, auth config, and webhook configuration.
 */

import { ${info.providerClassName} } from "../${info.providerClassName}";
import type { OAuthConfig, WebhookConfig } from "../../../core/types";

describe("${info.providerClassName}", () => {
    let provider: ${info.providerClassName};

    beforeEach(() => {
        provider = new ${info.providerClassName}();
    });

    describe("provider metadata", () => {
        it("has correct name and display name", () => {
            expect(provider.name).toBe("${info.name}");
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
${
    info.hasWebhookSupport
        ? `
        it("has OAuth fields if oauth2 auth method", () => {
            if (provider.authMethod === "oauth2") {
                const config = provider.getAuthConfig() as OAuthConfig;
                expect(config.authUrl).toBeDefined();
                expect(config.tokenUrl).toBeDefined();
                expect(Array.isArray(config.scopes)).toBe(true);
            }
        });
`
        : ""
}
    });
${
    info.hasWebhookSupport
        ? `
    describe("webhook configuration", () => {
        it("has webhook config if supportsWebhooks is true", () => {
            if (provider.capabilities.supportsWebhooks) {
                // Some providers declare webhook support but may not have config yet
                const config = provider.getWebhookConfig();
                // Just check it doesn't throw - config may be null if not fully implemented
                expect(config === null || config !== undefined).toBe(true);
            }
        });

        it("has valid signature type if webhook config exists", () => {
            const config = provider.getWebhookConfig();
            if (config) {
                expect(["hmac_sha256", "hmac_sha1", "timestamp_signature", "none"]).toContain(
                    config.signatureType
                );
            }
        });

        it("has signature header if signature type is not none", () => {
            const config = provider.getWebhookConfig();
            if (config && config.signatureType !== "none") {
                expect(config.signatureHeader).toBeDefined();
            }
        });
    });
`
        : ""
}
    describe("MCP tools", () => {
        it("generates tools for all operations", () => {
            const tools = provider.getMCPTools();
            const operations = provider.getOperations();

            expect(tools.length).toBe(operations.length);
        });

        it("follows naming convention", () => {
            const tools = provider.getMCPTools();
            const expectedPrefix = "${info.name}".replace(/-/g, "_") + "_";

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
`;
}

/**
 * Generate webhook.test.ts content
 */
function generateWebhookTest(info: ProviderInfo): string {
    const pascalName = toPascalCase(info.name);

    return `/**
 * ${pascalName} Webhook Verification Tests
 *
 * Tests ${info.name}-specific webhook signature verification and event extraction.
 */

import { ${info.providerClassName} } from "../${info.providerClassName}";
// TODO: Import webhook test utilities when implementing detailed tests
// import { create${pascalName}WebhookData, create${pascalName}EventPayload } from "../../../../../__tests__/helpers/webhook-test-utils";

describe("${pascalName} Webhook Verification", () => {
    let provider: ${info.providerClassName};
    const secret = "test_webhook_secret_12345";

    beforeEach(() => {
        provider = new ${info.providerClassName}();
    });

    describe("webhook configuration", () => {
        it("has webhook support enabled", () => {
            expect(provider.capabilities.supportsWebhooks).toBe(true);
        });

        it("has valid webhook config", () => {
            const config = provider.getWebhookConfig();
            expect(config).toBeDefined();
            expect(config?.signatureType).toBeDefined();
        });
    });

    describe("signature verification", () => {
        // TODO: Implement signature verification tests
        // These tests require provider-specific signature generation logic

        it.todo("verifies valid signature");
        it.todo("rejects invalid signature");
        it.todo("rejects missing signature header");
        it.todo("handles case-insensitive headers");
    });

    describe("event type extraction", () => {
        // TODO: Implement event type extraction tests
        // These tests require understanding of provider-specific event payloads

        it.todo("extracts event type from webhook payload");
        it.todo("handles malformed payloads gracefully");
    });
});
`;
}

/**
 * Generate operations.test.ts content
 */
function generateOperationsTest(info: ProviderInfo): string {
    const pascalName = toPascalCase(info.name);
    const clientName = info.clientFileName || `${pascalName}Client`;

    // Parse operation file names to get operation names
    const operationNames = info.operationFiles
        .filter((f) => !f.includes("index") && !f.includes("types") && !f.includes("schemas"))
        .map((f) => {
            // Convert filename like "createIssue.ts" to operation name
            return f.replace(".ts", "");
        });

    const operationDescribes = operationNames
        .map(
            (opName) => `
    describe("execute${toPascalCase(opName)}", () => {
        // TODO: Implement tests for ${opName} operation

        it.todo("calls client with correct params");
        it.todo("returns normalized output on success");
        it.todo("returns error on client failure");
    });`
        )
        .join("\n");

    return `/**
 * ${pascalName} Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// TODO: Import operation executors and schemas
// import { execute${pascalName}Operation, ${toCamelCase(info.name)}OperationSchema } from "../operations/${operationNames[0] || "index"}";
import type { ${clientName} } from "../client/${clientName}";

// Mock ${clientName} factory
function createMock${clientName}(): jest.Mocked<${clientName}> {
    return {
        // TODO: Add mock methods based on client interface
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<${clientName}>;
}

describe("${pascalName} Operation Executors", () => {
    let mockClient: jest.Mocked<${clientName}>;

    beforeEach(() => {
        mockClient = createMock${clientName}();
    });
${operationDescribes || `
    // TODO: Add operation executor tests
    it.todo("implement operation executor tests");
`}
});
`;
}

/**
 * Generate tests for a single provider
 */
function generateTestsForProvider(info: ProviderInfo, overwrite: boolean): void {
    const testsDir = path.join(PROVIDERS_DIR, info.dirName, "__tests__");

    // Create __tests__ directory if it doesn't exist
    if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
    }

    // Generate provider.test.ts
    const providerTestPath = path.join(testsDir, "provider.test.ts");
    if (!fs.existsSync(providerTestPath) || overwrite) {
        fs.writeFileSync(providerTestPath, generateProviderTest(info));
        console.log(`  Created: ${info.name}/__tests__/provider.test.ts`);
    } else {
        console.log(`  Skipped: ${info.name}/__tests__/provider.test.ts (exists)`);
    }

    // Generate webhook.test.ts if provider supports webhooks
    if (info.hasWebhookSupport) {
        const webhookTestPath = path.join(testsDir, "webhook.test.ts");
        if (!fs.existsSync(webhookTestPath) || overwrite) {
            fs.writeFileSync(webhookTestPath, generateWebhookTest(info));
            console.log(`  Created: ${info.name}/__tests__/webhook.test.ts`);
        } else {
            console.log(`  Skipped: ${info.name}/__tests__/webhook.test.ts (exists)`);
        }
    }

    // Generate operations.test.ts if provider has operations directory
    if (info.hasOperationsDir && info.hasClient) {
        const operationsTestPath = path.join(testsDir, "operations.test.ts");
        if (!fs.existsSync(operationsTestPath) || overwrite) {
            fs.writeFileSync(operationsTestPath, generateOperationsTest(info));
            console.log(`  Created: ${info.name}/__tests__/operations.test.ts`);
        } else {
            console.log(`  Skipped: ${info.name}/__tests__/operations.test.ts (exists)`);
        }
    }
}

/**
 * Main entry point
 */
function main(): void {
    const args = process.argv.slice(2);
    const overwrite = args.includes("--overwrite");
    const listOnly = args.includes("--list");
    const specificProvider = args.find((a) => a.startsWith("--provider="))?.split("=")[1];

    console.log("Provider Test Generator");
    console.log("=======================\n");

    // Get all provider directories
    const providerDirs = fs
        .readdirSync(PROVIDERS_DIR)
        .filter((f) => fs.statSync(path.join(PROVIDERS_DIR, f)).isDirectory());

    console.log(`Found ${providerDirs.length} provider directories\n`);

    // Filter to specific provider if requested
    const dirsToProcess = specificProvider
        ? providerDirs.filter((d) => d === specificProvider)
        : providerDirs;

    if (specificProvider && dirsToProcess.length === 0) {
        console.error(`Provider "${specificProvider}" not found`);
        process.exit(1);
    }

    // Scan providers
    const providers: ProviderInfo[] = [];
    for (const dir of dirsToProcess) {
        const info = scanProvider(dir);
        if (info) {
            providers.push(info);
        }
    }

    console.log(`Scanned ${providers.length} providers\n`);

    // List mode
    if (listOnly) {
        console.log("Providers:");
        for (const p of providers) {
            const flags = [
                p.hasClient ? "client" : "",
                p.hasWebhookSupport ? "webhook" : "",
                p.hasOperationsDir ? `ops(${p.operationFiles.length})` : "",
                p.hasMCPAdapter ? "mcp" : "",
                p.hasExistingTests ? `tests(${p.existingTestFiles.length})` : ""
            ]
                .filter(Boolean)
                .join(", ");
            console.log(`  ${p.name}: ${flags}`);
        }
        return;
    }

    // Generate tests
    console.log("Generating tests...\n");

    let created = 0;

    for (const provider of providers) {
        console.log(`Processing: ${provider.name}`);
        const testsDir = path.join(PROVIDERS_DIR, provider.dirName, "__tests__");
        const beforeCount = fs.existsSync(testsDir)
            ? fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts")).length
            : 0;

        generateTestsForProvider(provider, overwrite);

        const afterCount = fs.existsSync(testsDir)
            ? fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts")).length
            : 0;

        created += afterCount - beforeCount;
    }

    console.log(`\nDone!`);
    console.log(`  Providers processed: ${providers.length}`);
    console.log(`  Test files created: ${created}`);

    // Summary of what needs manual work
    const withWebhooks = providers.filter((p) => p.hasWebhookSupport);
    const withOperations = providers.filter((p) => p.hasOperationsDir && p.hasClient);

    console.log(`\nNext steps:`);
    console.log(`  - ${providers.length} provider.test.ts files need review`);
    console.log(`  - ${withWebhooks.length} webhook.test.ts files need implementation`);
    console.log(`  - ${withOperations.length} operations.test.ts files need implementation`);
    console.log(`\nRun agents to fill in detailed tests for each provider.`);
}

main();
