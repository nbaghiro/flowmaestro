/**
 * PowerBI Provider Operation Tests
 *
 * Tests Power BI operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { powerBIFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(powerBIFixtures);

describe("PowerBI Provider Operations", () => {
    describeProviderFixtures("power-bi");
});
