/**
 * Buffer Provider Operation Tests
 *
 * Tests Buffer operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { bufferFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(bufferFixtures);

describe("Buffer Provider Operations", () => {
    describeProviderFixtures("buffer");
});
