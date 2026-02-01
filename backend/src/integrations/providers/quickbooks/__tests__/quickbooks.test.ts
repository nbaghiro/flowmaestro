/**
 * Quickbooks Provider Operation Tests
 *
 * Tests Quickbooks operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { quickbooksFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(quickbooksFixtures);

describe("Quickbooks Provider Operations", () => {
    describeProviderFixtures("quickbooks");
});
