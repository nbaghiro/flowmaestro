/**
 * Heap Provider Operation Tests
 *
 * Tests Heap operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { heapFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(heapFixtures);

describe("Heap Provider Operations", () => {
    describeProviderFixtures("heap");
});
