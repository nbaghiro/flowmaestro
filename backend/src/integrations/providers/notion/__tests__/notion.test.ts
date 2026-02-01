/**
 * Notion Provider Operation Tests
 *
 * Tests Notion operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { notionFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(notionFixtures);

describe("Notion Provider Operations", () => {
    describeProviderFixtures("notion");
});
