/**
 * ShipStation Provider Operation Tests
 *
 * Tests ShipStation operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { shipstationFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(shipstationFixtures);

describe("ShipStation Provider Operations", () => {
    describeProviderFixtures("shipstation");
});
