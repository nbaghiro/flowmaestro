/**
 * Zendesk Provider Operation Tests
 *
 * Tests Zendesk operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { zendeskFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(zendeskFixtures);

describe("Zendesk Provider Operations", () => {
    describeProviderFixtures("zendesk");
});
