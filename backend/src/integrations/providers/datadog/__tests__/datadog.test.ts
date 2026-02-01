/**
 * Datadog Provider Operation Tests
 *
 * Tests Datadog operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { datadogFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(datadogFixtures);

describe("Datadog Provider Operations", () => {
    describeProviderFixtures("datadog");
});
