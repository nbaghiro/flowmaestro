/**
 * Reddit Provider Operation Tests
 *
 * Tests Reddit operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { redditFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(redditFixtures);

describe("Reddit Provider Operations", () => {
    describeProviderFixtures("reddit");
});
