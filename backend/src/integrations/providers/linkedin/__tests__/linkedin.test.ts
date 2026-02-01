/**
 * Linkedin Provider Operation Tests
 *
 * Tests Linkedin operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { linkedinFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(linkedinFixtures);

describe("Linkedin Provider Operations", () => {
    describeProviderFixtures("linkedin");
});
