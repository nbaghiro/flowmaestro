/**
 * MicrosoftPowerpoint Provider Operation Tests
 *
 * Tests MicrosoftPowerpoint operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { microsoftPowerpointFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(microsoftPowerpointFixtures);

describe("MicrosoftPowerpoint Provider Operations", () => {
    describeProviderFixtures("microsoft-powerpoint");
});
