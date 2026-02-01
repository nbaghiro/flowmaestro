/**
 * Slack Provider Operation Tests
 *
 * Tests Slack operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { slackFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(slackFixtures);

describe("Slack Provider Operations", () => {
    describeProviderFixtures("slack");
});
