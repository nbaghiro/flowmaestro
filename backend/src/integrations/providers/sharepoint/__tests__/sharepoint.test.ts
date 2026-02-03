/**
 * SharePoint Provider Operation Tests
 *
 * Tests SharePoint operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { sharepointFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(sharepointFixtures);

describe("SharePoint Provider Operations", () => {
    describeProviderFixtures("sharepoint");
});
