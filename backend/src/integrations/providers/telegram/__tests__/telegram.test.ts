/**
 * Telegram Provider Operation Tests
 *
 * Tests Telegram operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { telegramFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(telegramFixtures);

describe("Telegram Provider Operations", () => {
    describeProviderFixtures("telegram");
});
