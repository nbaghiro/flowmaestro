/**
 * Tableau Provider Operation Tests
 *
 * Tests Tableau operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { tableauFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(tableauFixtures);

describe("Tableau Provider Operations", () => {
    describeProviderFixtures("tableau");
});
