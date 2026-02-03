/**
 * PayPal Provider Operation Tests
 *
 * Tests PayPal operations using registered test fixtures and sandbox infrastructure.
 */

import { describeProviderFixtures } from "../../../../../__tests__/helpers/provider-test-utils";
import { fixtureRegistry } from "../../../sandbox";
import { paypalFixtures } from "./fixtures";

// Register fixtures before tests run
fixtureRegistry.registerAll(paypalFixtures);

describe("PayPal Provider Operations", () => {
    describeProviderFixtures("paypal");
});
