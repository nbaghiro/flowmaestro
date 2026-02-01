/**
 * CalCom Provider Operation Tests
 *
 * Tests CalCom operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { calComFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(calComFixtures);

describe("CalCom Provider Operations", () => {
    describeProviderFixtures("cal-com");
});
