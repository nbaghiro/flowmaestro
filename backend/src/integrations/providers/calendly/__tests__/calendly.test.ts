/**
 * Calendly Provider Operation Tests
 *
 * Tests Calendly operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { calendlyFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(calendlyFixtures);

describe("Calendly Provider Operations", () => {
    describeProviderFixtures("calendly");
});
