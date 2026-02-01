/**
 * Coda Provider Operation Tests
 *
 * Tests Coda operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { codaFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(codaFixtures);

describe("Coda Provider Operations", () => {
    describeProviderFixtures("coda");
});
