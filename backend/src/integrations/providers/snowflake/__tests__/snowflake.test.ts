/**
 * Snowflake Provider Operation Tests
 *
 * Tests Snowflake operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { snowflakeFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(snowflakeFixtures);

describe("Snowflake Provider Operations", () => {
    describeProviderFixtures("snowflake");
});
