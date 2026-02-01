/**
 * Figma Provider Operation Tests
 *
 * Tests Figma operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { figmaFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(figmaFixtures);

describe("Figma Provider Operations", () => {
    describeProviderFixtures("figma");
});
