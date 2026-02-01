/**
 * Postgresql Provider Operation Tests
 *
 * Tests Postgresql operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { postgresqlFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(postgresqlFixtures);

describe("Postgresql Provider Operations", () => {
    describeProviderFixtures("postgresql");
});
