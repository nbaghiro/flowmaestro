/**
 * Confluence Provider Operation Tests
 *
 * Tests Confluence operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { confluenceFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(confluenceFixtures);

describe("Confluence Provider Operations", () => {
    describeProviderFixtures("confluence");
});
