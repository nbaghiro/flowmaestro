/**
 * Twitter Provider Operation Tests
 *
 * Tests Twitter operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { twitterFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(twitterFixtures);

describe("Twitter Provider Operations", () => {
    describeProviderFixtures("twitter");
});
