/**
 * Vercel Provider Operation Tests
 *
 * Tests Vercel operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { vercelFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(vercelFixtures);

describe("Vercel Provider Operations", () => {
    describeProviderFixtures("vercel");
});
