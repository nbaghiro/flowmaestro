/**
 * MicrosoftOutlook Provider Operation Tests
 *
 * Tests MicrosoftOutlook operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { microsoftOutlookFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(microsoftOutlookFixtures);

describe("MicrosoftOutlook Provider Operations", () => {
    describeProviderFixtures("microsoft-outlook");
});
