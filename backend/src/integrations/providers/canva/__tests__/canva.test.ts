/**
 * Canva Provider Operation Tests
 *
 * Tests Canva operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { canvaFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(canvaFixtures);

describe("Canva Provider Operations", () => {
    describeProviderFixtures("canva");
});
