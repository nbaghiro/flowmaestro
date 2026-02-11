/**
 * Personio Provider Operation Tests
 *
 * Tests Personio operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { personioFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(personioFixtures);

describe("Personio Provider Operations", () => {
    describeProviderFixtures("personio");
});
