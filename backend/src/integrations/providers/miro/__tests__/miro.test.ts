/**
 * Miro Provider Operation Tests
 *
 * Tests Miro operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { miroFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(miroFixtures);

describe("Miro Provider Operations", () => {
    describeProviderFixtures("miro");
});
