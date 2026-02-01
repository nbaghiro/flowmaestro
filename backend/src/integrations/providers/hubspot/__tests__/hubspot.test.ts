/**
 * HubSpot Provider Operation Tests
 *
 * Tests HubSpot operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { hubspotFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(hubspotFixtures);

describe("HubSpot Provider Operations", () => {
    describeProviderFixtures("hubspot");
});
