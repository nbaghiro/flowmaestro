/**
 * Kustomer Provider Operation Tests
 *
 * Tests Kustomer operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { kustomerFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(kustomerFixtures);

describe("Kustomer Provider Operations", () => {
    describeProviderFixtures("kustomer");
});
