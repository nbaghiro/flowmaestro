/**
 * Stripe Provider Operation Tests
 *
 * Tests Stripe operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { stripeFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(stripeFixtures);

describe("Stripe Provider Operations", () => {
    describeProviderFixtures("stripe");
});
