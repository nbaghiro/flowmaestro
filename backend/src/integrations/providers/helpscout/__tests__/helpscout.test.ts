/**
 * Help Scout Provider Operation Tests
 *
 * Tests Help Scout operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { helpscoutFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(helpscoutFixtures);

describe("Help Scout Provider Operations", () => {
    describeProviderFixtures("helpscout");
});
