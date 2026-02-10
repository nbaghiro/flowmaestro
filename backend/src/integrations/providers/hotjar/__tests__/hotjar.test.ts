/**
 * Hotjar Provider Operation Tests
 *
 * Tests Hotjar operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { hotjarFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(hotjarFixtures);

describe("Hotjar Provider Operations", () => {
    describeProviderFixtures("hotjar");
});
