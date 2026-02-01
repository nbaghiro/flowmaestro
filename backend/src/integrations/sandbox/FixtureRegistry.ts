/**
 * Fixture Registry
 *
 * Central registry for test fixtures. Fixtures are registered here and
 * queried by the SandboxDataService during test connection execution.
 */

import type { TestFixture, TestCase } from "./types";

export class FixtureRegistry {
    private fixtures: Map<string, TestFixture<unknown, unknown>> = new Map();

    /**
     * Register a test fixture for an operation
     */
    register<TInput, TOutput>(fixture: TestFixture<TInput, TOutput>): void {
        const key = `${fixture.provider}:${fixture.operationId}`;
        this.fixtures.set(key, fixture as TestFixture<unknown, unknown>);
    }

    /**
     * Register multiple fixtures at once
     */
    registerAll(fixtures: TestFixture<unknown, unknown>[]): void {
        for (const fixture of fixtures) {
            this.register(fixture);
        }
    }

    /**
     * Get a fixture for a specific operation
     */
    get(provider: string, operationId: string): TestFixture<unknown, unknown> | undefined {
        return this.fixtures.get(`${provider}:${operationId}`);
    }

    /**
     * Check if a fixture exists for an operation
     */
    has(provider: string, operationId: string): boolean {
        return this.fixtures.has(`${provider}:${operationId}`);
    }

    /**
     * Get all fixtures for a provider
     */
    getByProvider(provider: string): TestFixture<unknown, unknown>[] {
        const result: TestFixture<unknown, unknown>[] = [];
        for (const [key, fixture] of this.fixtures) {
            if (key.startsWith(`${provider}:`)) {
                result.push(fixture);
            }
        }
        return result;
    }

    /**
     * Get a specific test case by name
     */
    getTestCase(
        provider: string,
        operationId: string,
        caseName: string
    ): TestCase<unknown, unknown> | undefined {
        const fixture = this.get(provider, operationId);
        if (!fixture) return undefined;

        return [...fixture.validCases, ...fixture.errorCases].find((c) => c.name === caseName);
    }

    /**
     * Get all registered providers
     */
    getProviders(): string[] {
        const providers = new Set<string>();
        for (const key of this.fixtures.keys()) {
            const [provider] = key.split(":");
            providers.add(provider);
        }
        return Array.from(providers);
    }

    /**
     * Get fixture count per provider
     */
    getCoverage(): Record<string, number> {
        const coverage: Record<string, number> = {};
        for (const key of this.fixtures.keys()) {
            const [provider] = key.split(":");
            coverage[provider] = (coverage[provider] || 0) + 1;
        }
        return coverage;
    }

    /**
     * Clear all fixtures (for testing)
     */
    clear(): void {
        this.fixtures.clear();
    }
}

export const fixtureRegistry = new FixtureRegistry();
