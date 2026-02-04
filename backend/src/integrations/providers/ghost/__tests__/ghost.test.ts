/**
 * Ghost Provider Operation Tests
 *
 * Tests Ghost operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { ghostFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(ghostFixtures);

describe("Ghost Provider Operations", () => {
    describeProviderFixtures("ghost");
});
