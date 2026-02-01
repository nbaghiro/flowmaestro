/**
 * Gmail Provider Operation Tests
 *
 * Tests Gmail operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { gmailFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(gmailFixtures);

describe("Gmail Provider Operations", () => {
    describeProviderFixtures("gmail");
});
