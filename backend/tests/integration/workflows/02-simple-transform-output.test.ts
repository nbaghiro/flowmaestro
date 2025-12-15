import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";
import workflowDefinition from "../fixtures/workflows/02-simple-transform-output.json";

describe("Simple transform → variable → output flow", () => {
    let pool: Pool;
    let testHarness: WorkflowTestHarness;
    let temporalAvailable = true;

    beforeAll(async () => {
        pool = getGlobalTestPool();
        testHarness = new WorkflowTestHarness(pool);
        try {
            await testHarness.initialize();
        } catch (err) {
            temporalAvailable = false;
            console.warn(
                "[Integration Test] Temporal not available, skipping workflow assertions:",
                err instanceof Error ? err.message : err
            );
        }
    });

    afterAll(async () => {
        await testHarness.cleanup();
    });

    it("produces sum and message in order", async () => {
        if (!temporalAvailable) return;

        const numbers = [4, 6]; // sum = 10

        const result = await testHarness.executeWorkflow(workflowDefinition, { numbers });

        expect(result.success).toBe(true);
        expect(result.outputs.result).toEqual({
            sum: 10,
            message: "Low sum 10",
            filtered: [6],
            filteredCount: 1
        });
    });

    it("routes high branch and uses filteredCount", async () => {
        if (!temporalAvailable) return;

        const numbers = [7, 6]; // sum = 13, filtered = [7,6]

        const result = await testHarness.executeWorkflow(workflowDefinition, { numbers });

        expect(result.success).toBe(true);
        expect(result.outputs.result).toEqual({
            sum: 13,
            message: "High sum 13 with 2 filtered",
            filtered: [7, 6],
            filteredCount: 2
        });
    });
});
