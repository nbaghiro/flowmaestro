/**
 * Salesforce Provider Operation Tests
 *
 * Tests Salesforce operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { salesforceFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(salesforceFixtures);

describe("Salesforce Provider Operations", () => {
    describeProviderFixtures("salesforce");
});
