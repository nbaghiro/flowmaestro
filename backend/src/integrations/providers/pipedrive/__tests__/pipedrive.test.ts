/**
 * Pipedrive Provider Operation Tests
 *
 * Tests Pipedrive operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { pipedriveFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(pipedriveFixtures);

describe("Pipedrive Provider Operations", () => {
    describeProviderFixtures("pipedrive");
});
