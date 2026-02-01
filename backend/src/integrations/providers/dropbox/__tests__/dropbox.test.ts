/**
 * Dropbox Provider Operation Tests
 *
 * Tests Dropbox operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { dropboxFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(dropboxFixtures);

describe("Dropbox Provider Operations", () => {
    describeProviderFixtures("dropbox");
});
