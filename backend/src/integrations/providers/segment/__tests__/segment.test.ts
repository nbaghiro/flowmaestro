/**
 * Segment Provider Operation Tests
 *
 * Tests Segment operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { segmentFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(segmentFixtures);

describe("Segment Provider Operations", () => {
    describeProviderFixtures("segment");
});
