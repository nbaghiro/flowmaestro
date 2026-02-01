/**
 * Marketo Provider Operation Tests
 *
 * Tests Marketo operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { marketoFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(marketoFixtures);

describe("Marketo Provider Operations", () => {
    describeProviderFixtures("marketo");
});
