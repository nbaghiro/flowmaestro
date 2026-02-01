/**
 * Freshbooks Provider Operation Tests
 *
 * Tests Freshbooks operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { freshbooksFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(freshbooksFixtures);

describe("Freshbooks Provider Operations", () => {
    describeProviderFixtures("freshbooks");
});
