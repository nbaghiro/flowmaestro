/**
 * Drift Provider Operation Tests
 *
 * Tests Drift operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { driftFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(driftFixtures);

describe("Drift Provider Operations", () => {
    describeProviderFixtures("drift");
});
