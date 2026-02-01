/**
 * Clickup Provider Operation Tests
 *
 * Tests Clickup operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { clickupFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(clickupFixtures);

describe("Clickup Provider Operations", () => {
    describeProviderFixtures("clickup");
});
