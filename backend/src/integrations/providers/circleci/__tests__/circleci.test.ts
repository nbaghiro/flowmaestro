/**
 * Circleci Provider Operation Tests
 *
 * Tests Circleci operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { circleciFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(circleciFixtures);

describe("Circleci Provider Operations", () => {
    describeProviderFixtures("circleci");
});
