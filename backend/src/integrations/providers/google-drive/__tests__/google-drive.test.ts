/**
 * GoogleDrive Provider Operation Tests
 *
 * Tests GoogleDrive operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleDriveFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleDriveFixtures);

describe("GoogleDrive Provider Operations", () => {
    describeProviderFixtures("google-drive");
});
