/**
 * Hootsuite Provider Operation Tests
 *
 * Tests Hootsuite operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { hootsuiteFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(hootsuiteFixtures);

describe("Hootsuite Provider Operations", () => {
    describeProviderFixtures("hootsuite");
});
