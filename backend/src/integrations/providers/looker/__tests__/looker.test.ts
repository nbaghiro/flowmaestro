/**
 * Looker Provider Operation Tests
 *
 * Tests Looker operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { lookerFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(lookerFixtures);

describe("Looker Provider Operations", () => {
    describeProviderFixtures("looker");
});
