/**
 * Gitlab Provider Operation Tests
 *
 * Tests Gitlab operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { gitlabFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(gitlabFixtures);

describe("Gitlab Provider Operations", () => {
    describeProviderFixtures("gitlab");
});
