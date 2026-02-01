/**
 * Pagerduty Provider Operation Tests
 *
 * Tests Pagerduty operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { pagerdutyFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(pagerdutyFixtures);

describe("Pagerduty Provider Operations", () => {
    describeProviderFixtures("pagerduty");
});
