/**
 * Square Provider Operation Tests
 *
 * Tests Square operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { squareFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(squareFixtures);

describe("Square Provider Operations", () => {
    describeProviderFixtures("square");
});
