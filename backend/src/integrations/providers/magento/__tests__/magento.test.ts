/**
 * Magento Provider Operation Tests
 *
 * Tests Magento operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { magentoFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(magentoFixtures);

describe("Magento Provider Operations", () => {
    describeProviderFixtures("magento");
});
