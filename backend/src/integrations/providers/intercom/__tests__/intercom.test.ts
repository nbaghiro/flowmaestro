/**
 * Intercom Provider Operation Tests
 *
 * Tests Intercom operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { intercomFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(intercomFixtures);

describe("Intercom Provider Operations", () => {
    describeProviderFixtures("intercom");
});
