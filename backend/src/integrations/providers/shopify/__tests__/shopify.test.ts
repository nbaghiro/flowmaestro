/**
 * Shopify Provider Operation Tests
 *
 * Tests Shopify operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { shopifyFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(shopifyFixtures);

describe("Shopify Provider Operations", () => {
    describeProviderFixtures("shopify");
});
