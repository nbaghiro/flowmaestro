/**
 * Discord Provider Operation Tests
 *
 * Tests Discord operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { discordFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(discordFixtures);

describe("Discord Provider Operations", () => {
    describeProviderFixtures("discord");
});
