/**
 * Redis Provider Operation Tests
 *
 * Tests Redis operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { redisFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(redisFixtures);

describe("Redis Provider Operations", () => {
    describeProviderFixtures("redis");
});
