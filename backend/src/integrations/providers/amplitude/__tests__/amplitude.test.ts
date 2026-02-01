/**
 * Amplitude Provider Operation Tests
 *
 * Tests Amplitude operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { amplitudeFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(amplitudeFixtures);

describe("Amplitude Provider Operations", () => {
    describeProviderFixtures("amplitude");
});
