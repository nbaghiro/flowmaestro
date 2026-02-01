/**
 * Workday Provider Operation Tests
 *
 * Tests Workday operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { workdayFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(workdayFixtures);

describe("Workday Provider Operations", () => {
    describeProviderFixtures("workday");
});
