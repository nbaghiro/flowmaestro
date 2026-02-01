/**
 * Facebook Provider Operation Tests
 *
 * Tests Facebook operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { facebookFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(facebookFixtures);

describe("Facebook Provider Operations", () => {
    describeProviderFixtures("facebook");
});
