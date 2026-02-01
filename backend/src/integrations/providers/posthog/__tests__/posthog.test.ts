/**
 * Posthog Provider Operation Tests
 *
 * Tests Posthog operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { posthogFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(posthogFixtures);

describe("Posthog Provider Operations", () => {
    describeProviderFixtures("posthog");
});
