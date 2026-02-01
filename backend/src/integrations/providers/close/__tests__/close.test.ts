/**
 * Close Provider Operation Tests
 *
 * Tests Close operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { closeFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(closeFixtures);

describe("Close Provider Operations", () => {
    describeProviderFixtures("close");
});
