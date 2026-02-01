/**
 * Youtube Provider Operation Tests
 *
 * Tests Youtube operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { youtubeFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(youtubeFixtures);

describe("Youtube Provider Operations", () => {
    describeProviderFixtures("youtube");
});
