/**
 * Airtable Provider Operation Tests
 *
 * Tests Airtable operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { airtableFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(airtableFixtures);

describe("Airtable Provider Operations", () => {
    describeProviderFixtures("airtable");
});
