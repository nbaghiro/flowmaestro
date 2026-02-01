/**
 * Bitbucket Provider Operation Tests
 *
 * Tests Bitbucket operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { bitbucketFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(bitbucketFixtures);

describe("Bitbucket Provider Operations", () => {
    describeProviderFixtures("bitbucket");
});
