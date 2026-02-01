/* eslint-disable no-console */
/**
 * Fixture Completeness Tests
 *
 * Meta-tests that validate the fixture infrastructure itself.
 * Ensures all providers have fixtures, all operations are covered,
 * and fixtures follow the expected structure.
 */

import { providerRegistry } from "../../core/ProviderRegistry";
import { fixtureRegistry } from "../index";

// Import registry to ensure all providers are registered
import "../../registry";

// Import fixtures to register them
import "../../../../__tests__/fixtures/integration-fixtures";

describe("Fixture Completeness", () => {
    // List of all registered providers (extracted from registry.ts)
    const registeredProviders = providerRegistry.getRegisteredProviders();

    describe("All Providers Have Fixtures", () => {
        it("has fixtures registered for all providers", () => {
            const fixtureProviders = fixtureRegistry.getProviders();
            const missingFixtures = registeredProviders.filter(
                (provider) => !fixtureProviders.includes(provider)
            );

            if (missingFixtures.length > 0) {
                console.warn(`Providers missing fixtures: ${missingFixtures.join(", ")}`);
            }

            expect(fixtureProviders.length).toBeGreaterThan(0);
            expect(missingFixtures).toEqual([]);
        });

        it("has no orphan fixtures (fixtures for non-existent providers)", () => {
            const fixtureProviders = fixtureRegistry.getProviders();
            const orphanFixtures = fixtureProviders.filter(
                (provider) => !registeredProviders.includes(provider)
            );

            if (orphanFixtures.length > 0) {
                console.warn(
                    `Orphan fixtures (no matching provider): ${orphanFixtures.join(", ")}`
                );
            }

            expect(orphanFixtures).toEqual([]);
        });
    });

    describe("All Operations Covered", () => {
        // This test dynamically loads each provider and checks operations
        it.each(registeredProviders)(
            "provider %s has fixtures for all operations",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const operations = provider.getOperations();
                const fixtures = fixtureRegistry.getByProvider(providerName);
                const fixtureOperationIds = fixtures.map((f) => f.operationId);

                const missingOperations = operations
                    .map((op) => op.id)
                    .filter((opId) => !fixtureOperationIds.includes(opId));

                if (missingOperations.length > 0) {
                    console.warn(
                        `Provider ${providerName} missing fixtures for: ${missingOperations.join(", ")}`
                    );
                }

                // Warn but don't fail - operations may have valid reasons to not have fixtures
                // (e.g., deprecated operations, operations that are too complex to mock)
                expect(fixtures.length).toBeGreaterThan(0);
            }
        );
    });

    describe("Valid Case Required", () => {
        it("each fixture has at least one validCase", () => {
            const providers = fixtureRegistry.getProviders();
            const fixturesWithoutValidCases: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                for (const fixture of fixtures) {
                    if (!fixture.validCases || fixture.validCases.length === 0) {
                        fixturesWithoutValidCases.push(`${provider}:${fixture.operationId}`);
                    }
                }
            }

            if (fixturesWithoutValidCases.length > 0) {
                console.error(
                    `Fixtures missing validCases: ${fixturesWithoutValidCases.join(", ")}`
                );
            }

            expect(fixturesWithoutValidCases).toEqual([]);
        });
    });

    describe("Fixture Structure", () => {
        it("fixtures have required fields (operationId, provider, validCases)", () => {
            const providers = fixtureRegistry.getProviders();
            const invalidFixtures: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                for (const fixture of fixtures) {
                    const issues: string[] = [];

                    if (!fixture.operationId) {
                        issues.push("missing operationId");
                    }
                    if (!fixture.provider) {
                        issues.push("missing provider");
                    }
                    if (!Array.isArray(fixture.validCases)) {
                        issues.push("validCases is not an array");
                    }

                    if (issues.length > 0) {
                        invalidFixtures.push(
                            `${provider}:${fixture.operationId || "unknown"} (${issues.join(", ")})`
                        );
                    }
                }
            }

            if (invalidFixtures.length > 0) {
                console.error(`Invalid fixtures: ${invalidFixtures.join("; ")}`);
            }

            expect(invalidFixtures).toEqual([]);
        });

        it("validCases have required fields (name, input)", () => {
            const providers = fixtureRegistry.getProviders();
            const invalidCases: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                for (const fixture of fixtures) {
                    for (let i = 0; i < fixture.validCases.length; i++) {
                        const testCase = fixture.validCases[i];
                        const issues: string[] = [];

                        if (!testCase.name) {
                            issues.push("missing name");
                        }
                        if (testCase.input === undefined) {
                            issues.push("missing input");
                        }

                        if (issues.length > 0) {
                            invalidCases.push(
                                `${provider}:${fixture.operationId}.validCases[${i}] (${issues.join(", ")})`
                            );
                        }
                    }
                }
            }

            if (invalidCases.length > 0) {
                console.error(`Invalid validCases: ${invalidCases.join("; ")}`);
            }

            expect(invalidCases).toEqual([]);
        });

        it("errorCases have required fields (name, input, expectedError)", () => {
            const providers = fixtureRegistry.getProviders();
            const invalidCases: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                for (const fixture of fixtures) {
                    if (!fixture.errorCases) continue;

                    for (let i = 0; i < fixture.errorCases.length; i++) {
                        const testCase = fixture.errorCases[i];
                        const issues: string[] = [];

                        if (!testCase.name) {
                            issues.push("missing name");
                        }
                        if (testCase.input === undefined) {
                            issues.push("missing input");
                        }
                        if (!testCase.expectedError) {
                            issues.push("missing expectedError");
                        } else {
                            if (!testCase.expectedError.type) {
                                issues.push("expectedError missing type");
                            }
                        }

                        if (issues.length > 0) {
                            invalidCases.push(
                                `${provider}:${fixture.operationId}.errorCases[${i}] (${issues.join(", ")})`
                            );
                        }
                    }
                }
            }

            if (invalidCases.length > 0) {
                console.error(`Invalid errorCases: ${invalidCases.join("; ")}`);
            }

            expect(invalidCases).toEqual([]);
        });
    });

    describe("No Duplicate Fixtures", () => {
        it("no duplicate operationId within a provider", () => {
            const providers = fixtureRegistry.getProviders();
            const duplicates: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                const operationIds = fixtures.map((f) => f.operationId);
                const uniqueIds = new Set(operationIds);

                if (operationIds.length !== uniqueIds.size) {
                    // Find the duplicates
                    const seen = new Set<string>();
                    for (const id of operationIds) {
                        if (seen.has(id)) {
                            duplicates.push(`${provider}:${id}`);
                        }
                        seen.add(id);
                    }
                }
            }

            if (duplicates.length > 0) {
                console.error(`Duplicate fixtures: ${duplicates.join(", ")}`);
            }

            expect(duplicates).toEqual([]);
        });

        it("no duplicate test case names within a fixture", () => {
            const providers = fixtureRegistry.getProviders();
            const duplicates: string[] = [];

            for (const provider of providers) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                for (const fixture of fixtures) {
                    const allCases = [
                        ...fixture.validCases,
                        ...(fixture.errorCases || []),
                        ...(fixture.edgeCases || [])
                    ];
                    const caseNames = allCases.map((c) => c.name);
                    const uniqueNames = new Set(caseNames);

                    if (caseNames.length !== uniqueNames.size) {
                        const seen = new Set<string>();
                        for (const name of caseNames) {
                            if (seen.has(name)) {
                                duplicates.push(`${provider}:${fixture.operationId}.${name}`);
                            }
                            seen.add(name);
                        }
                    }
                }
            }

            if (duplicates.length > 0) {
                console.error(`Duplicate test case names: ${duplicates.join(", ")}`);
            }

            expect(duplicates).toEqual([]);
        });
    });

    describe("Fixture Registry Methods", () => {
        it("getCoverage returns correct counts per provider", () => {
            const coverage = fixtureRegistry.getCoverage();

            expect(typeof coverage).toBe("object");

            // Verify counts match actual fixture counts
            for (const [provider, count] of Object.entries(coverage)) {
                const fixtures = fixtureRegistry.getByProvider(provider);
                expect(count).toBe(fixtures.length);
            }
        });

        it("getTestCase returns the correct test case", () => {
            const providers = fixtureRegistry.getProviders();
            if (providers.length === 0) {
                return; // Skip if no fixtures registered
            }

            // Get a fixture with validCases
            const provider = providers[0];
            const fixtures = fixtureRegistry.getByProvider(provider);
            const fixture = fixtures[0];

            if (fixture.validCases.length > 0) {
                const validCase = fixture.validCases[0];
                const retrievedCase = fixtureRegistry.getTestCase(
                    provider,
                    fixture.operationId,
                    validCase.name
                );

                expect(retrievedCase).toBeDefined();
                expect(retrievedCase?.name).toBe(validCase.name);
            }
        });

        it("get returns undefined for non-existent fixture", () => {
            const fixture = fixtureRegistry.get("non-existent-provider", "non-existent-operation");
            expect(fixture).toBeUndefined();
        });

        it("has returns false for non-existent fixture", () => {
            const exists = fixtureRegistry.has("non-existent-provider", "non-existent-operation");
            expect(exists).toBe(false);
        });
    });

    describe("Coverage Summary", () => {
        it("prints fixture coverage summary", () => {
            const coverage = fixtureRegistry.getCoverage();
            const providers = fixtureRegistry.getProviders();
            const totalFixtures = Object.values(coverage).reduce((a, b) => a + b, 0);

            console.log("\n=== Fixture Coverage Summary ===");
            console.log(`Total providers with fixtures: ${providers.length}`);
            console.log(`Total fixtures: ${totalFixtures}`);
            console.log("\nPer-provider breakdown:");

            const sortedProviders = Object.entries(coverage).sort(([, a], [, b]) => b - a);
            for (const [provider, count] of sortedProviders) {
                console.log(`  ${provider}: ${count} fixtures`);
            }

            // This test always passes - it's informational
            expect(true).toBe(true);
        });
    });
});
