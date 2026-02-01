/**
 * Sentry Provider Operation Tests
 *
 * Tests Sentry operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { sentryFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(sentryFixtures);

describe("Sentry Provider Operations", () => {
    describeProviderFixtures("sentry");
});
