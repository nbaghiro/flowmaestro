/**
 * Box Provider Operation Tests
 *
 * Tests Box operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { boxFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(boxFixtures);

describe("Box Provider Operations", () => {
    describeProviderFixtures("box");
});
