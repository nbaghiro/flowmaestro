/**
 * GitHub Provider Operation Tests
 *
 * Tests GitHub operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { githubFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(githubFixtures);

describe("GitHub Provider Operations", () => {
    describeProviderFixtures("github");
});
