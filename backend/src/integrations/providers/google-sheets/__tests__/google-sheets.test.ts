/**
 * GoogleSheets Provider Operation Tests
 *
 * Tests GoogleSheets operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleSheetsFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleSheetsFixtures);

describe("GoogleSheets Provider Operations", () => {
    describeProviderFixtures("google-sheets");
});
