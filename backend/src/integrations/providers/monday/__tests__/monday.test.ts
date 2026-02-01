/**
 * Monday Provider Operation Tests
 *
 * Tests Monday operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { mondayFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(mondayFixtures);

describe("Monday Provider Operations", () => {
    describeProviderFixtures("monday");
});
