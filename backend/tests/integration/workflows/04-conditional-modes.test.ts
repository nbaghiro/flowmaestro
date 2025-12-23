/**
 * Integration Test: Conditional Node Modes
 * Covers router mode and boolean if/else mode using fixture workflows.
 */

import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import routerWorkflow from "../../fixtures/workflows/07-conditional-router-routing.json";
import ifElseWorkflow from "../../fixtures/workflows/08-conditional-if-else.json";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

describe("Conditional Node Modes", () => {
    let pool: Pool;
    let testHarness: WorkflowTestHarness;

    beforeAll(async () => {
        pool = getGlobalTestPool();
        testHarness = new WorkflowTestHarness(pool);
        await testHarness.initialize();
    });

    afterAll(async () => {
        await testHarness.cleanup();
    });

    it("should route using conditional router mode", async () => {
        const result = await testHarness.executeWorkflow(routerWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.routeResult as {
            route: string;
            priority: string;
            score: number;
        };

        expect(output).toBeDefined();
        expect(output.route).toBe("high");
        expect(output.priority).toBe("high");
        expect(output.score).toBe(92);
    });

    it("should branch using conditional if/else mode", async () => {
        const result = await testHarness.executeWorkflow(ifElseWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.decisionResult as {
            decision: string;
            status: string;
            branch: string;
        };

        expect(output).toBeDefined();
        expect(output.decision).toBe("ship");
        expect(output.status).toBe("approved");
        expect(output.branch).toBe("true");
    });
});
