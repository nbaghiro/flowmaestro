/**
 * Trello Provider Operation Tests
 *
 * Tests Trello operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { trelloFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(trelloFixtures);

describe("Trello Provider Operations", () => {
    describeProviderFixtures("trello");
});
