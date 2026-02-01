/**
 * MicrosoftWord Provider Operation Tests
 *
 * Tests MicrosoftWord operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { microsoftWordFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(microsoftWordFixtures);

describe("MicrosoftWord Provider Operations", () => {
    describeProviderFixtures("microsoft-word");
});
