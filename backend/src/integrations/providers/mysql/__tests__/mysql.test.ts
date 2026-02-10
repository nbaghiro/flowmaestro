/**
 * Mysql Provider Operation Tests
 *
 * Tests Mysql operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { mysqlFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(mysqlFixtures);

describe("Mysql Provider Operations", () => {
    describeProviderFixtures("mysql");
});
