/**
 * Mixpanel Provider Operation Tests
 *
 * Tests Mixpanel operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { mixpanelFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(mixpanelFixtures);

describe("Mixpanel Provider Operations", () => {
    describeProviderFixtures("mixpanel");
});
