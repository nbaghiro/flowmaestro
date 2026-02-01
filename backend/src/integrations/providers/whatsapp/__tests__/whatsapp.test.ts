/**
 * Whatsapp Provider Operation Tests
 *
 * Tests Whatsapp operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { whatsappFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(whatsappFixtures);

describe("Whatsapp Provider Operations", () => {
    describeProviderFixtures("whatsapp");
});
