/**
 * HiBob Provider Operation Tests
 *
 * Tests HiBob operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { hibobFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(hibobFixtures);

describe("HiBob Provider Operations", () => {
    describeProviderFixtures("hibob");
});
