/**
 * MicrosoftExcel Provider Operation Tests
 *
 * Tests MicrosoftExcel operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { microsoftExcelFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(microsoftExcelFixtures);

describe("MicrosoftExcel Provider Operations", () => {
    describeProviderFixtures("microsoft-excel");
});
