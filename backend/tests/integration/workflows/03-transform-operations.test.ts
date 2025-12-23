/**
 * Integration Test: Transform Operations
 * Tests map, filter, aggregate, and deduplicate operations using fixture workflows.
 */

import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import mapFilterWorkflow from "../../fixtures/workflows/03-transform-map-filter.json";
import aggregateWorkflow from "../../fixtures/workflows/04-transform-aggregate.json";
import deduplicateWorkflow from "../../fixtures/workflows/05-transform-deduplicate.json";
import filterWorkflow from "../../fixtures/workflows/06-transform-filter-removed.json";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

type WorkflowDefinition = {
    nodes: Record<string, { config: Record<string, unknown> }>;
};

const withOutputConfig = (
    workflowDefinition: WorkflowDefinition,
    outputNodeId: string,
    outputVariable: string,
    fields: string[]
) => {
    const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition)) as WorkflowDefinition;
    const outputConfig = testWorkflow.nodes[outputNodeId]?.config;
    if (!outputConfig) {
        throw new Error(`Output node "${outputNodeId}" not found in workflow definition`);
    }
    outputConfig.outputVariable = outputVariable;
    outputConfig.fields = fields;
    return testWorkflow;
};

describe("Transform Workflows", () => {
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

    it("should map and filter items with JavaScript + JSONata", async () => {
        const testWorkflow = withOutputConfig(mapFilterWorkflow, "output-1", "activeItemsResult", [
            "activeItems",
            "activeItems_count"
        ]);

        const result = await testHarness.executeWorkflow(testWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.activeItemsResult as {
            activeItems: Array<{
                id: number;
                name: string;
                status: string;
                score: number;
                tagCount: number;
            }>;
            activeItems_count: number;
        };

        expect(output.activeItems_count).toBe(2);
        expect(output.activeItems).toEqual([
            { id: 1, name: "Alpha", status: "active", score: 92, tagCount: 2 },
            { id: 4, name: "Delta", status: "active", score: 88, tagCount: 3 }
        ]);
    });

    it("should aggregate sums by category", async () => {
        const testWorkflow = withOutputConfig(
            aggregateWorkflow,
            "output-1",
            "totalsByCategoryResult",
            ["totalsByCategory"]
        );

        const result = await testHarness.executeWorkflow(testWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.totalsByCategoryResult as {
            totalsByCategory: Record<string, number>;
        };

        expect(output.totalsByCategory.books).toBeCloseTo(20.25, 2);
        expect(output.totalsByCategory.games).toBeCloseTo(98.99, 2);
        expect(output.totalsByCategory.music).toBeCloseTo(15, 2);
    });

    it("should deduplicate customers by email (case-insensitive, keep last)", async () => {
        const testWorkflow = withOutputConfig(
            deduplicateWorkflow,
            "output-1",
            "uniqueCustomersResult",
            ["uniqueCustomers", "uniqueCustomers_count", "duplicateCount"]
        );

        const result = await testHarness.executeWorkflow(testWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.uniqueCustomersResult as {
            uniqueCustomers: Array<{ id: string; email: string; name: string }>;
            uniqueCustomers_count: number;
            duplicateCount: number;
        };

        expect(output.uniqueCustomers_count).toBe(3);
        expect(output.duplicateCount).toBe(2);
        expect(output.uniqueCustomers).toMatchObject([
            { id: "c2", email: "user@example.com", name: "Ava M" },
            { id: "c4", email: "lisa@example.com", name: "Lisa" },
            { id: "c5", email: "SAM@example.com", name: "Samuel" }
        ]);
    });

    it("should filter high-priority tasks by JSONata predicate", async () => {
        const testWorkflow = withOutputConfig(
            filterWorkflow,
            "output-1",
            "highPriorityTasksResult",
            ["highPriorityTasks", "highPriorityTasks_count"]
        );

        const result = await testHarness.executeWorkflow(testWorkflow);
        expect(result.success).toBe(true);

        const output = result.outputs.highPriorityTasksResult as {
            highPriorityTasks: Array<{ id: number; title: string; priority: string }>;
            highPriorityTasks_count: number;
        };

        expect(output.highPriorityTasks_count).toBe(3);
        expect(output.highPriorityTasks.map((task) => task.id)).toEqual([1, 3, 5]);
    });
});
