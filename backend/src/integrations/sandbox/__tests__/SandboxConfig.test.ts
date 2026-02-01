/**
 * SandboxConfig Unit Tests
 *
 * Tests for configuration loading from environment variables.
 */

import { getSandboxConfig } from "../SandboxConfig";

describe("SandboxConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment to clean state
        jest.resetModules();
        process.env = { ...originalEnv };
        // Clear sandbox-related env vars
        delete process.env.SANDBOX_MODE_ENABLED;
        delete process.env.SANDBOX_MODE_FALLBACK;
        delete process.env.SANDBOX_MODE_PROVIDERS;
        delete process.env.SANDBOX_MODE_OPERATIONS;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("getSandboxConfig", () => {
        describe("enabled flag", () => {
            it("returns enabled: false by default", () => {
                const config = getSandboxConfig();
                expect(config.enabled).toBe(false);
            });

            it("returns enabled: true when SANDBOX_MODE_ENABLED=true", () => {
                process.env.SANDBOX_MODE_ENABLED = "true";
                const config = getSandboxConfig();
                expect(config.enabled).toBe(true);
            });

            it("returns enabled: false when SANDBOX_MODE_ENABLED=false", () => {
                process.env.SANDBOX_MODE_ENABLED = "false";
                const config = getSandboxConfig();
                expect(config.enabled).toBe(false);
            });

            it("returns enabled: false for invalid values", () => {
                process.env.SANDBOX_MODE_ENABLED = "yes";
                const config = getSandboxConfig();
                expect(config.enabled).toBe(false);
            });
        });

        describe("fallbackBehavior", () => {
            it("returns 'error' by default", () => {
                const config = getSandboxConfig();
                expect(config.fallbackBehavior).toBe("error");
            });

            it("returns configured fallback behavior", () => {
                process.env.SANDBOX_MODE_FALLBACK = "passthrough";
                const config = getSandboxConfig();
                expect(config.fallbackBehavior).toBe("passthrough");
            });

            it("accepts 'empty' fallback", () => {
                process.env.SANDBOX_MODE_FALLBACK = "empty";
                const config = getSandboxConfig();
                expect(config.fallbackBehavior).toBe("empty");
            });

            it("accepts 'error' fallback", () => {
                process.env.SANDBOX_MODE_FALLBACK = "error";
                const config = getSandboxConfig();
                expect(config.fallbackBehavior).toBe("error");
            });
        });

        describe("providerOverrides", () => {
            it("returns empty object by default", () => {
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({});
            });

            it("parses single provider override", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:sandbox";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({
                    slack: { enabled: true }
                });
            });

            it("parses multiple provider overrides", () => {
                process.env.SANDBOX_MODE_PROVIDERS =
                    "slack:sandbox,github:passthrough,stripe:disabled";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({
                    slack: { enabled: true },
                    github: { enabled: true, fallbackBehavior: "passthrough" },
                    stripe: { enabled: false }
                });
            });

            it("parses 'sandbox' mode as enabled", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:sandbox";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: true });
            });

            it("parses 'passthrough' mode with fallback", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:passthrough";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({
                    enabled: true,
                    fallbackBehavior: "passthrough"
                });
            });

            it("parses 'error' mode with fallback", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:error";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({
                    enabled: true,
                    fallbackBehavior: "error"
                });
            });

            it("parses 'empty' mode with fallback", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:empty";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({
                    enabled: true,
                    fallbackBehavior: "empty"
                });
            });

            it("parses 'disabled' mode", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:disabled";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: false });
            });

            it("parses 'off' mode as disabled", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:off";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: false });
            });

            it("handles whitespace in provider config", () => {
                process.env.SANDBOX_MODE_PROVIDERS = " slack : sandbox , github : passthrough ";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({
                    slack: { enabled: true },
                    github: { enabled: true, fallbackBehavior: "passthrough" }
                });
            });

            it("ignores invalid entries", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:sandbox,invalid,github:passthrough";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({
                    slack: { enabled: true },
                    github: { enabled: true, fallbackBehavior: "passthrough" }
                });
            });

            it("handles empty string", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({});
            });
        });

        describe("operationOverrides", () => {
            it("returns empty object by default", () => {
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({});
            });

            it("parses single operation override", () => {
                process.env.SANDBOX_MODE_OPERATIONS = "slack:sendMessage:sandbox";
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({
                    "slack:sendMessage": { enabled: true }
                });
            });

            it("parses multiple operation overrides", () => {
                process.env.SANDBOX_MODE_OPERATIONS =
                    "slack:sendMessage:sandbox,github:createIssue:passthrough,stripe:createCharge:disabled";
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({
                    "slack:sendMessage": { enabled: true },
                    "github:createIssue": { enabled: true, fallbackBehavior: "passthrough" },
                    "stripe:createCharge": { enabled: false }
                });
            });

            it("handles whitespace in operation config", () => {
                process.env.SANDBOX_MODE_OPERATIONS = " slack : sendMessage : sandbox ";
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({
                    "slack:sendMessage": { enabled: true }
                });
            });

            it("ignores entries with fewer than 3 parts", () => {
                process.env.SANDBOX_MODE_OPERATIONS =
                    "slack:sendMessage:sandbox,invalid:entry,another";
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({
                    "slack:sendMessage": { enabled: true }
                });
            });

            it("handles empty string", () => {
                process.env.SANDBOX_MODE_OPERATIONS = "";
                const config = getSandboxConfig();
                expect(config.operationOverrides).toEqual({});
            });
        });

        describe("combined configuration", () => {
            it("parses all config options together", () => {
                process.env.SANDBOX_MODE_ENABLED = "true";
                process.env.SANDBOX_MODE_FALLBACK = "passthrough";
                process.env.SANDBOX_MODE_PROVIDERS = "slack:sandbox,github:disabled";
                process.env.SANDBOX_MODE_OPERATIONS = "slack:sendMessage:error";

                const config = getSandboxConfig();

                expect(config).toEqual({
                    enabled: true,
                    fallbackBehavior: "passthrough",
                    providerOverrides: {
                        slack: { enabled: true },
                        github: { enabled: false }
                    },
                    operationOverrides: {
                        "slack:sendMessage": { enabled: true, fallbackBehavior: "error" }
                    }
                });
            });

            it("returns complete default config when no env vars set", () => {
                const config = getSandboxConfig();

                expect(config).toEqual({
                    enabled: false,
                    fallbackBehavior: "error",
                    providerOverrides: {},
                    operationOverrides: {}
                });
            });
        });

        describe("mode parsing edge cases", () => {
            it("parses 'true' string as enabled", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:true";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: true });
            });

            it("parses 'false' string as disabled", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:false";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: false });
            });

            it("is case-insensitive for mode values", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "a:SANDBOX,b:Passthrough,c:DISABLED";
                const config = getSandboxConfig();
                expect(config.providerOverrides).toEqual({
                    a: { enabled: true },
                    b: { enabled: true, fallbackBehavior: "passthrough" },
                    c: { enabled: false }
                });
            });

            it("handles unknown mode values as disabled", () => {
                process.env.SANDBOX_MODE_PROVIDERS = "slack:unknown";
                const config = getSandboxConfig();
                expect(config.providerOverrides.slack).toEqual({ enabled: false });
            });
        });
    });
});
