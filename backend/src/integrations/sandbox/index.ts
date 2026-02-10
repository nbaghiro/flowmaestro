/**
 * Sandbox Module
 *
 * Provides sandbox/test connection support for integration operations.
 * Test connections return mock data instead of hitting real APIs.
 *
 * The ExecutionRouter automatically routes to sandbox mode when:
 * 1. The connection has isTestConnection: true in metadata
 * 2. The provider or operation is configured for sandbox mode
 * 3. Global sandbox mode is enabled via SANDBOX_MODE_ENABLED env var
 */

// Types
export type { TestFixture, TestCase, ExpectedError, SandboxScenario } from "./types";

// Fixture Registry
export { FixtureRegistry, fixtureRegistry } from "./FixtureRegistry";

// Sandbox Services
export { SandboxDataService, sandboxDataService } from "./SandboxDataService";
export { getSandboxConfig, type SandboxConfig } from "./SandboxConfig";

// Fixture Loader
export { loadAllFixtures, areFixturesLoaded } from "./fixtureLoader";
