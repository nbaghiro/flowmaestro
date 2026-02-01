/**
 * Hellosign Provider Operation Tests
 *
 * Tests Hellosign operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { hellosignFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(hellosignFixtures);

describe("Hellosign Provider Operations", () => {
    describeProviderFixtures("hellosign");
});
