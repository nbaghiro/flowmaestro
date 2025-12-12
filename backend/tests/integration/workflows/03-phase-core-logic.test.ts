import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import workflowDefinition from "../../fixtures/workflows/03-phase-core-logic.json";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

describe("Phase 01-03: Core logic flow (transform → conditional → variable → output)", () => {
    let pool: Pool;
    let testHarness: WorkflowTestHarness;
    const scenarios = [
        {
            name: "high-sum branch",
            numbers: [2, 3, 5], // sum = 10 → high path
            expected: {
                sum: 10,
                filteredNumbers: [3, 5],
                filteredCount: 2,
                message: "High sum 10 with 2 passing numbers"
            }
        },
        {
            name: "low-sum branch",
            numbers: [1, 2, 2], // sum = 5 → low path
            expected: {
                sum: 5,
                filteredNumbers: [],
                filteredCount: 0,
                message: "Low sum 5"
            }
        }
    ];

    beforeAll(async () => {
        pool = getGlobalTestPool();
        testHarness = new WorkflowTestHarness(pool);
        await testHarness.initialize();
    });

    afterAll(async () => {
        await testHarness.cleanup();
    });

    it.each(scenarios)(
        "routes to the $name and returns enriched output",
        async ({ numbers, expected }) => {
            const result = await testHarness.executeWorkflow(workflowDefinition, { numbers });

            expect(result.success).toBe(true);
            expect(result.outputs.result).toEqual(expected);
        }
    );
});
