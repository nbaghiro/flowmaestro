/**
 * Instagram Provider Operation Tests
 *
 * Tests Instagram operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { instagramFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(instagramFixtures);

describe("Instagram Provider Operations", () => {
    describeProviderFixtures("instagram");
});
