/**
 * Mongodb Provider Operation Tests
 *
 * Tests Mongodb operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { mongodbFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(mongodbFixtures);

describe("Mongodb Provider Operations", () => {
    describeProviderFixtures("mongodb");
});
