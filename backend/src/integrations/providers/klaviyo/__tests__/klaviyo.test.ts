/**
 * Klaviyo Provider Operation Tests
 *
 * Tests Klaviyo operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { klaviyoFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(klaviyoFixtures);

describe("Klaviyo Provider Operations", () => {
    describeProviderFixtures("klaviyo");
});
