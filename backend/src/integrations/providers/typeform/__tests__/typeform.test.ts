/**
 * Typeform Provider Operation Tests
 *
 * Tests Typeform operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { typeformFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(typeformFixtures);

describe("Typeform Provider Operations", () => {
    describeProviderFixtures("typeform");
});
