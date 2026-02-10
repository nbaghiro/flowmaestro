/**
 * GoogleAnalytics Provider Operation Tests
 *
 * Tests Google Analytics operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleAnalyticsFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleAnalyticsFixtures);

describe("GoogleAnalytics Provider Operations", () => {
    describeProviderFixtures("google-analytics");
});
