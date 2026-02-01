/**
 * Apollo Provider Operation Tests
 *
 * Tests Apollo operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { apolloFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(apolloFixtures);

describe("Apollo Provider Operations", () => {
    describeProviderFixtures("apollo");
});
