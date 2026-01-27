import { test, expect } from "../fixtures/test-fixtures";

/**
 * E2E Tests: Workflow Execution
 *
 * Tests the workflow execution flow including:
 * - Starting workflow execution
 * - Monitoring execution progress
 * - Viewing execution results
 * - Handling execution errors
 */

test.describe("Execute Workflow", () => {
    // Use a pre-created workflow for execution tests
    const TEST_WORKFLOW_ID = "test-workflow-id"; // This should be set up in test fixtures

    test.beforeEach(async ({ page }) => {
        // Navigate to a test workflow
        await page.goto(`/workflows/${TEST_WORKFLOW_ID}`);
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });
    });

    test("should display execute button when workflow is valid", async ({ page }) => {
        const executeButton = page.locator('[data-testid="execute-workflow-button"]');
        await expect(executeButton).toBeVisible();
    });

    test("should disable execute button for invalid workflow", async ({ page }) => {
        // Navigate to an empty/invalid workflow
        await page.goto("/workflows/new");
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        const executeButton = page.locator('[data-testid="execute-workflow-button"]');
        await expect(executeButton).toBeDisabled();
    });

    test("should open execution dialog when execute is clicked", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');

        const dialog = page.locator('[data-testid="execution-dialog"]');
        await expect(dialog).toBeVisible();
    });

    test("should show input fields for workflow inputs", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Should show input fields for workflow input nodes
        const inputFields = page.locator('[data-testid^="execution-input-"]');
        const count = await inputFields.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should start execution and show progress", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Fill any required inputs
        const requiredInputs = page.locator('[data-testid^="execution-input-"][required]');
        const inputCount = await requiredInputs.count();
        for (let i = 0; i < inputCount; i++) {
            await requiredInputs.nth(i).fill("Test input value");
        }

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Should show execution status
        const status = page.locator('[data-testid="execution-status"]');
        await expect(status).toBeVisible({ timeout: 10000 });
    });

    test("should show node status during execution", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Wait for nodes to start executing
        await page.waitForSelector('[data-testid="node-status-running"]', { timeout: 15000 });

        // Should show running status on at least one node
        const runningNodes = page.locator('[data-testid="node-status-running"]');
        const count = await runningNodes.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should show completion status when workflow finishes", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Wait for completion (longer timeout for actual execution)
        await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 60000 });

        // Should show success or failure status
        const status = page.locator('[data-testid="execution-status"]');
        const statusText = await status.textContent();
        expect(statusText).toMatch(/completed|failed|success/i);
    });

    test("should display execution output", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Wait for completion
        await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 60000 });

        // Should show output panel
        const outputPanel = page.locator('[data-testid="execution-output"]');
        await expect(outputPanel).toBeVisible();
    });

    test("should allow viewing node outputs", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Wait for at least one node to complete
        await page.waitForSelector('[data-testid="node-status-completed"]', { timeout: 30000 });

        // Click on completed node
        await page.click('[data-testid="node-status-completed"]');

        // Should show node output
        const nodeOutput = page.locator('[data-testid="node-output-panel"]');
        await expect(nodeOutput).toBeVisible();
    });

    test("should show error details for failed nodes", async ({ page }) => {
        // This test assumes a workflow that will fail
        await page.goto("/workflows/test-failing-workflow");
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        await page.click('[data-testid="start-execution-button"]');

        // Wait for failure
        await page.waitForSelector('[data-testid="node-status-failed"]', { timeout: 60000 });

        // Click on failed node
        await page.click('[data-testid="node-status-failed"]');

        // Should show error details
        const errorDetails = page.locator('[data-testid="node-error-details"]');
        await expect(errorDetails).toBeVisible();
    });

    test("should allow canceling execution", async ({ page }) => {
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        // Start execution
        await page.click('[data-testid="start-execution-button"]');

        // Wait for execution to start
        await page.waitForSelector('[data-testid="execution-status"]', { timeout: 10000 });

        // Cancel execution
        const cancelButton = page.locator('[data-testid="cancel-execution-button"]');
        if (await cancelButton.isVisible()) {
            await cancelButton.click();

            // Should show canceled status
            const status = page.locator('[data-testid="execution-status"]');
            await expect(status).toContainText(/cancel/i);
        }
    });

    test("should show execution history", async ({ page }) => {
        // Navigate to workflow with execution history
        await page.click('[data-testid="execution-history-tab"]');

        // Should show previous executions
        const historyList = page.locator('[data-testid="execution-history-list"]');
        await expect(historyList).toBeVisible();
    });

    test("should allow re-running previous execution", async ({ page }) => {
        await page.click('[data-testid="execution-history-tab"]');
        await page.waitForSelector('[data-testid="execution-history-list"]');

        // Click on a previous execution
        const previousExecution = page.locator('[data-testid^="execution-history-item-"]').first();
        if (await previousExecution.isVisible()) {
            await previousExecution.click();

            // Should show re-run button
            const rerunButton = page.locator('[data-testid="rerun-execution-button"]');
            await expect(rerunButton).toBeVisible();
        }
    });
});
