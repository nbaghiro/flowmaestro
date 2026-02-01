/**
 * Rate Limiting and Retry Tests
 *
 * Tests that integration operations correctly identify and handle rate limit errors.
 * Verifies consistent error format across providers and proper retry flag settings.
 */

import { ExecutionRouter } from "../../../../src/integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../../src/integrations/core/ProviderRegistry";
import { fixtureRegistry, sandboxDataService } from "../../../../src/integrations/sandbox";
import {
    createTestConnection,
    createExecutionContext,
    expectOperationError
} from "../../../helpers/provider-test-utils";
import type { OperationError } from "../../../../src/integrations/core/types";
import type { TestFixture, TestCase } from "../../../../src/integrations/sandbox/types";

// Import fixtures to register them
import "../../../fixtures/integration-fixtures";

/**
 * Providers known to have rate_limit error cases in their fixtures
 */
const PROVIDERS_WITH_RATE_LIMIT_CASES = [
    "airtable",
    "amplitude",
    "apollo",
    "asana",
    "bitbucket",
    "buffer",
    "cal-com",
    "calendly",
    "circleci",
    "clickup",
    "close",
    "coda",
    "datadog",
    "discord",
    "docusign",
    "dropbox",
    "facebook",
    "figma",
    "freshbooks",
    "freshdesk",
    "github",
    "gitlab",
    "gmail",
    "google-calendar",
    "google-docs",
    "google-drive",
    "google-forms",
    "google-sheets",
    "google-slides",
    "heap",
    "hellosign",
    "hootsuite",
    "hubspot",
    "instagram",
    "intercom",
    "klaviyo",
    "linear",
    "linkedin",
    "mailchimp",
    "marketo",
    "medium",
    "mixpanel",
    "monday",
    "notion",
    "pagerduty",
    "pipedrive",
    "posthog",
    "quickbooks",
    "reddit",
    "salesforce",
    "segment",
    "sendgrid",
    "sentry",
    "shopify",
    "slack",
    "square",
    "stripe",
    "surveymonkey",
    "telegram",
    "trello",
    "twitter",
    "typeform",
    "vercel",
    "whatsapp",
    "youtube",
    "zendesk"
];

/**
 * Get all fixtures from all known providers
 */
function getAllFixtures(): TestFixture[] {
    const allFixtures: TestFixture[] = [];
    for (const provider of PROVIDERS_WITH_RATE_LIMIT_CASES) {
        const providerFixtures = fixtureRegistry.getByProvider(provider);
        allFixtures.push(...providerFixtures);
    }
    return allFixtures;
}

/**
 * Extract rate_limit error cases from a fixture
 */
function getRateLimitErrorCases(
    fixture: TestFixture
): Array<{ fixture: TestFixture; testCase: TestCase<unknown, undefined> }> {
    return fixture.errorCases
        .filter((tc) => tc.expectedError?.type === "rate_limit")
        .map((testCase) => ({ fixture, testCase }));
}

/**
 * Get all rate_limit error cases for a provider
 */
function getProviderRateLimitCases(
    provider: string
): Array<{ fixture: TestFixture; testCase: TestCase<unknown, undefined> }> {
    const fixtures = fixtureRegistry.getByProvider(provider);
    return fixtures.flatMap((fixture) => getRateLimitErrorCases(fixture));
}

describe("Rate Limiting and Retry Behavior", () => {
    let router: ExecutionRouter;

    beforeAll(() => {
        router = new ExecutionRouter(providerRegistry);
    });

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe("Rate Limit Detection", () => {
        it.each(PROVIDERS_WITH_RATE_LIMIT_CASES)(
            "%s provider has rate_limit error cases defined",
            (provider) => {
                const rateLimitCases = getProviderRateLimitCases(provider);
                expect(rateLimitCases.length).toBeGreaterThan(0);
            }
        );

        it("should detect rate_limit errors across multiple providers", () => {
            let totalRateLimitCases = 0;

            for (const provider of PROVIDERS_WITH_RATE_LIMIT_CASES) {
                const cases = getProviderRateLimitCases(provider);
                totalRateLimitCases += cases.length;
            }

            // We expect each provider to have at least one rate_limit case
            expect(totalRateLimitCases).toBeGreaterThanOrEqual(
                PROVIDERS_WITH_RATE_LIMIT_CASES.length
            );
        });
    });

    describe("Retryable Flag for Rate Limit Errors", () => {
        it.each(PROVIDERS_WITH_RATE_LIMIT_CASES)(
            "%s rate_limit errors have retryable: true",
            (provider) => {
                const rateLimitCases = getProviderRateLimitCases(provider);

                for (const { testCase } of rateLimitCases) {
                    expect(testCase.expectedError?.retryable).toBe(true);
                }
            }
        );

        it("all rate_limit error cases should be marked as retryable", () => {
            const allFixtures = getAllFixtures();
            const rateLimitCases: Array<{
                provider: string;
                operationId: string;
                testCase: TestCase<unknown, undefined>;
            }> = [];

            for (const fixture of allFixtures) {
                const cases = getRateLimitErrorCases(fixture);
                for (const { testCase } of cases) {
                    rateLimitCases.push({
                        provider: fixture.provider,
                        operationId: fixture.operationId,
                        testCase
                    });
                }
            }

            const nonRetryableCases = rateLimitCases.filter(
                (c) => c.testCase.expectedError?.retryable !== true
            );

            // All rate_limit errors should be retryable
            expect(nonRetryableCases).toEqual([]);
        });
    });

    describe("Error Type Consistency", () => {
        it("rate_limit error type is one of the valid OperationError types", () => {
            const validErrorTypes: OperationError["type"][] = [
                "validation",
                "permission",
                "not_found",
                "rate_limit",
                "server_error"
            ];

            expect(validErrorTypes).toContain("rate_limit");
        });

        it.each(PROVIDERS_WITH_RATE_LIMIT_CASES)(
            "%s rate_limit errors use consistent error type",
            (provider) => {
                const rateLimitCases = getProviderRateLimitCases(provider);

                for (const { testCase } of rateLimitCases) {
                    expect(testCase.expectedError?.type).toBe("rate_limit");
                }
            }
        );
    });

    describe("Rate Limit Response Structure", () => {
        it.each(PROVIDERS_WITH_RATE_LIMIT_CASES)(
            "%s rate_limit errors have proper structure",
            (provider) => {
                const rateLimitCases = getProviderRateLimitCases(provider);

                for (const { testCase } of rateLimitCases) {
                    const error = testCase.expectedError;
                    expect(error).toBeDefined();
                    expect(error?.type).toBe("rate_limit");
                    expect(typeof error?.message).toBe("string");
                    expect(error?.message?.length).toBeGreaterThan(0);
                    expect(error?.retryable).toBe(true);
                }
            }
        );
    });

    describe("Rate Limit Error Execution via Sandbox", () => {
        const testProviders = ["slack", "github", "airtable", "hubspot", "stripe"];

        it.each(testProviders)(
            "%s returns rate_limit error with retryable flag when triggered",
            async (provider) => {
                const rateLimitCases = getProviderRateLimitCases(provider);

                if (rateLimitCases.length === 0) {
                    return; // Skip if no rate limit cases
                }

                const { fixture, testCase } = rateLimitCases[0];

                // Register the rate limit scenario
                const scenarioId = `rate-limit-${provider}-${fixture.operationId}`;
                sandboxDataService.registerScenario({
                    id: scenarioId,
                    provider,
                    operation: fixture.operationId,
                    paramMatchers: testCase.input as Record<string, unknown>,
                    response: {
                        success: false,
                        error: {
                            type: "rate_limit",
                            message: testCase.expectedError?.message || "Rate limit exceeded",
                            retryable: true
                        }
                    }
                });

                const connection = createTestConnection(provider);
                const context = createExecutionContext("workflow");

                const result = await router.execute(
                    provider,
                    fixture.operationId,
                    testCase.input as Record<string, unknown>,
                    connection,
                    context
                );

                expectOperationError(result, {
                    type: "rate_limit",
                    retryable: true
                });

                sandboxDataService.removeScenario(scenarioId);
            }
        );
    });

    describe("Rate Limit Error Messages", () => {
        it("rate_limit error messages should be descriptive", () => {
            const allFixtures = getAllFixtures();
            const rateLimitMessages: string[] = [];

            for (const fixture of allFixtures) {
                const cases = getRateLimitErrorCases(fixture);
                for (const { testCase } of cases) {
                    if (testCase.expectedError?.message) {
                        rateLimitMessages.push(testCase.expectedError.message);
                    }
                }
            }

            // All messages should be non-empty
            for (const message of rateLimitMessages) {
                expect(message.length).toBeGreaterThan(0);
            }

            // Messages should contain rate-related keywords
            const rateKeywords = ["rate", "limit", "too", "many", "slow", "exceeded", "quota"];
            const hasRateKeyword = (msg: string): boolean => {
                const lowerMsg = msg.toLowerCase();
                return rateKeywords.some((keyword) => lowerMsg.includes(keyword));
            };

            const messagesWithKeywords = rateLimitMessages.filter(hasRateKeyword);
            // At least 80% of messages should contain rate-related keywords
            expect(messagesWithKeywords.length / rateLimitMessages.length).toBeGreaterThan(0.8);
        });
    });

    describe("Agent Context Rate Limiting", () => {
        it("rate_limit errors are consistent in agent mode", async () => {
            const provider = "slack";
            const rateLimitCases = getProviderRateLimitCases(provider);

            if (rateLimitCases.length === 0) {
                return;
            }

            const { fixture, testCase } = rateLimitCases[0];

            const scenarioId = `agent-rate-limit-${provider}`;
            sandboxDataService.registerScenario({
                id: scenarioId,
                provider,
                operation: fixture.operationId,
                paramMatchers: testCase.input as Record<string, unknown>,
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: testCase.expectedError?.message || "Rate limit exceeded",
                        retryable: true
                    }
                }
            });

            const connection = createTestConnection(provider);
            const context = createExecutionContext("agent");

            const result = await router.execute(
                provider,
                fixture.operationId,
                testCase.input as Record<string, unknown>,
                connection,
                context
            );

            expectOperationError(result, {
                type: "rate_limit",
                retryable: true
            });

            sandboxDataService.removeScenario(scenarioId);
        });
    });

    describe("Multi-Provider Rate Limit Consistency", () => {
        it("rate_limit error structure is consistent across all providers", () => {
            const allFixtures = getAllFixtures();
            const providerErrorStructures: Map<
                string,
                Array<{
                    operationId: string;
                    error: {
                        type: string;
                        retryable: boolean;
                        hasMessage: boolean;
                    };
                }>
            > = new Map();

            for (const fixture of allFixtures) {
                const cases = getRateLimitErrorCases(fixture);
                if (cases.length === 0) continue;

                if (!providerErrorStructures.has(fixture.provider)) {
                    providerErrorStructures.set(fixture.provider, []);
                }

                for (const { testCase } of cases) {
                    providerErrorStructures.get(fixture.provider)?.push({
                        operationId: fixture.operationId,
                        error: {
                            type: testCase.expectedError?.type || "",
                            retryable: testCase.expectedError?.retryable ?? false,
                            hasMessage: Boolean(testCase.expectedError?.message)
                        }
                    });
                }
            }

            // Verify all providers have consistent structure
            for (const [_provider, errors] of providerErrorStructures) {
                for (const errorInfo of errors) {
                    expect(errorInfo.error.type).toBe("rate_limit");
                    expect(errorInfo.error.retryable).toBe(true);
                    expect(errorInfo.error.hasMessage).toBe(true);
                }
            }

            // Verify we tested multiple providers
            expect(providerErrorStructures.size).toBeGreaterThan(10);
        });
    });

    describe("Rate Limit vs Other Error Types", () => {
        it("rate_limit errors are distinct from server_error", () => {
            const allFixtures = getAllFixtures();

            for (const fixture of allFixtures) {
                const rateLimitCases = fixture.errorCases.filter(
                    (tc) => tc.expectedError?.type === "rate_limit"
                );
                const serverErrorCases = fixture.errorCases.filter(
                    (tc) => tc.expectedError?.type === "server_error"
                );

                // Rate limit cases should have different names than server error cases
                for (const rlCase of rateLimitCases) {
                    for (const seCase of serverErrorCases) {
                        // They might have similar inputs but should be different test cases
                        expect(rlCase.name).not.toBe(seCase.name);
                    }
                }
            }
        });

        it("rate_limit errors are always retryable, unlike validation errors", () => {
            const allFixtures = getAllFixtures();

            for (const fixture of allFixtures) {
                const rateLimitCases = fixture.errorCases.filter(
                    (tc) => tc.expectedError?.type === "rate_limit"
                );
                const validationCases = fixture.errorCases.filter(
                    (tc) => tc.expectedError?.type === "validation"
                );

                // All rate_limit should be retryable
                for (const rlCase of rateLimitCases) {
                    expect(rlCase.expectedError?.retryable).toBe(true);
                }

                // Validation errors are typically not retryable (but some may be)
                // We just verify they exist and have the correct type
                for (const valCase of validationCases) {
                    expect(valCase.expectedError?.type).toBe("validation");
                }
            }
        });
    });
});
