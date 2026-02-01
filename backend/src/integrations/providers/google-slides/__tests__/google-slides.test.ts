/**
 * GoogleSlides Provider Operation Tests
 *
 * Tests GoogleSlides operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { googleSlidesFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(googleSlidesFixtures);

describe("GoogleSlides Provider Operations", () => {
    describeProviderFixtures("google-slides");
});
