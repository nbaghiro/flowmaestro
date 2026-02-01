/**
 * Linear Provider Operation Tests
 *
 * Tests Linear operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { linearFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(linearFixtures);

describe("Linear Provider Operations", () => {
    describeProviderFixtures("linear");
});
