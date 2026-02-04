/**
 * Supabase Provider Operation Tests
 *
 * Tests Supabase operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { supabaseFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(supabaseFixtures);

describe("Supabase Provider Operations", () => {
    describeProviderFixtures("supabase");
});
