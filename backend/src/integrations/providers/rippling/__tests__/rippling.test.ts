/**
 * Rippling Provider Operation Tests
 *
 * Tests Rippling operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { ripplingFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(ripplingFixtures);

describe("Rippling Provider Operations", () => {
    describeProviderFixtures("rippling");
});
