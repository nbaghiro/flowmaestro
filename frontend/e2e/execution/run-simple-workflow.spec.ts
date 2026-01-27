import { test, expect } from "../fixtures/test-fixtures";

/**
 * E2E Tests: Run Simple Workflow (Complete User Journey)
 *
 * Tests the complete user journey of:
 * 1. Creating a simple chat workflow
 * 2. Configuring the nodes
 * 3. Executing the workflow
 * 4. Viewing the results
 */

test.describe("Run Simple Workflow Journey", () => {
    test("should complete the full simple-chat workflow journey", async ({ page }) => {
        // ====================================================================
        // STEP 1: Navigate to workflows and create new workflow
        // ====================================================================
        await test.step("Create workflow from simple-chat pattern", async () => {
            await page.goto("/workflows");

            // Click create workflow
            await page.click('[data-testid="create-workflow-button"]');
            await page.waitForSelector('[data-testid="create-workflow-dialog"]');

            // Fill workflow name
            await page.fill('[data-testid="workflow-name-input"]', "E2E Test Simple Chat");

            // Select simple-chat pattern
            await page.click('[data-testid="pattern-simple-chat"]');

            // Submit
            await page.click('[data-testid="create-workflow-submit"]');

            // Wait for canvas to load
            await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

            // Verify we have 3 nodes
            const nodes = page.locator('[data-testid^="node-"]');
            await expect(nodes).toHaveCount(3, { timeout: 10000 });
        });

        // ====================================================================
        // STEP 2: Verify and configure nodes
        // ====================================================================
        await test.step("Verify pattern nodes are present", async () => {
            // Should have input node
            const inputNode = page.locator('[data-node-type="input"]');
            await expect(inputNode).toBeVisible();

            // Should have LLM node
            const llmNode = page.locator('[data-node-type="llm"]');
            await expect(llmNode).toBeVisible();

            // Should have output node
            const outputNode = page.locator('[data-node-type="output"]');
            await expect(outputNode).toBeVisible();
        });

        await test.step("Configure LLM node", async () => {
            // Select LLM node
            await page.click('[data-node-type="llm"]');
            await page.waitForSelector('[data-testid="node-inspector"]');

            // Update label
            const labelField = page.locator('[data-testid="field-label"]');
            if (await labelField.isVisible()) {
                await labelField.fill("AI Assistant");
            }

            // Verify provider is set (should default to openai)
            const providerField = page.locator('[data-testid="field-provider"]');
            if (await providerField.isVisible()) {
                await expect(providerField).toBeVisible();
            }
        });

        // ====================================================================
        // STEP 3: Save workflow
        // ====================================================================
        await test.step("Save workflow", async () => {
            await page.click('[data-testid="save-workflow-button"]');

            // Wait for save confirmation
            const toast = page.locator('[data-testid="save-success-toast"]');
            await expect(toast).toBeVisible({ timeout: 10000 });
        });

        // ====================================================================
        // STEP 4: Execute workflow
        // ====================================================================
        await test.step("Open execution dialog", async () => {
            await page.click('[data-testid="execute-workflow-button"]');
            await page.waitForSelector('[data-testid="execution-dialog"]');

            // Should show input field for user question
            const inputField = page.locator('[data-testid^="execution-input-"]');
            await expect(inputField).toBeVisible();
        });

        await test.step("Provide input and start execution", async () => {
            // Fill in the input
            const inputField = page.locator('[data-testid^="execution-input-"]').first();
            await inputField.fill("What is 2 + 2?");

            // Start execution
            await page.click('[data-testid="start-execution-button"]');

            // Should show execution status
            const status = page.locator('[data-testid="execution-status"]');
            await expect(status).toBeVisible({ timeout: 10000 });
        });

        // ====================================================================
        // STEP 5: Monitor execution progress
        // ====================================================================
        await test.step("Monitor node execution", async () => {
            // Wait for nodes to show status
            // Input node should complete first
            await page.waitForSelector('[data-testid="node-status-completed"]', {
                timeout: 30000
            });

            // At least one node should be completed or running
            const completedNodes = page.locator('[data-testid="node-status-completed"]');
            const runningNodes = page.locator('[data-testid="node-status-running"]');

            const completed = await completedNodes.count();
            const running = await runningNodes.count();

            expect(completed + running).toBeGreaterThan(0);
        });

        // ====================================================================
        // STEP 6: Wait for completion and verify results
        // ====================================================================
        await test.step("Wait for completion", async () => {
            // Wait for execution to complete
            await page.waitForSelector('[data-testid="execution-complete"]', {
                timeout: 60000
            });

            // Verify all nodes completed
            const completedNodes = page.locator('[data-testid="node-status-completed"]');
            await expect(completedNodes).toHaveCount(3, { timeout: 10000 });
        });

        await test.step("Verify output results", async () => {
            // Should show execution output
            const outputPanel = page.locator('[data-testid="execution-output"]');
            await expect(outputPanel).toBeVisible();

            // Output should contain something (the LLM response)
            const outputContent = await outputPanel.textContent();
            expect(outputContent?.length).toBeGreaterThan(0);
        });
    });

    test("should handle execution errors gracefully", async ({ page }) => {
        // Create a workflow that will fail (e.g., missing required configuration)
        await page.goto("/workflows");

        // Create blank workflow
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');
        await page.fill('[data-testid="workflow-name-input"]', "E2E Test Error Workflow");
        await page.click('[data-testid="create-workflow-submit"]');
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        // Add an LLM node without proper configuration
        await page.click('[data-testid="add-node-button"]');
        await page.click('[data-testid="node-item-llm"]');
        await page.keyboard.press("Escape");

        // Try to execute
        const executeButton = page.locator('[data-testid="execute-workflow-button"]');

        // Should be disabled or show validation error
        if (await executeButton.isEnabled()) {
            await executeButton.click();

            // Should show validation error or execution error
            const errorMessage = page.locator('[data-testid="validation-error"]');
            const executionError = page.locator('[data-testid="execution-error"]');

            const hasError = (await errorMessage.isVisible()) || (await executionError.isVisible());
            expect(hasError).toBeTruthy();
        } else {
            // Button is correctly disabled
            await expect(executeButton).toBeDisabled();
        }
    });

    test("should allow re-running workflow with different inputs", async ({ page }) => {
        // Use a pre-created workflow
        await page.goto("/workflows");

        // Create simple chat workflow
        await page.click('[data-testid="create-workflow-button"]');
        await page.fill('[data-testid="workflow-name-input"]', "Rerun Test Workflow");
        await page.click('[data-testid="pattern-simple-chat"]');
        await page.click('[data-testid="create-workflow-submit"]');
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        // First execution
        await test.step("First execution", async () => {
            await page.click('[data-testid="execute-workflow-button"]');
            await page.waitForSelector('[data-testid="execution-dialog"]');

            await page.fill('[data-testid^="execution-input-"]', "First question");
            await page.click('[data-testid="start-execution-button"]');

            await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 60000 });
        });

        // Second execution with different input
        await test.step("Second execution with different input", async () => {
            // Close previous execution dialog if open
            await page.keyboard.press("Escape");

            // Re-open execution dialog
            await page.click('[data-testid="execute-workflow-button"]');
            await page.waitForSelector('[data-testid="execution-dialog"]');

            // Different input
            await page.fill('[data-testid^="execution-input-"]', "Second question");
            await page.click('[data-testid="start-execution-button"]');

            await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 60000 });

            // Both executions should be in history
            await page.click('[data-testid="execution-history-tab"]');
            const historyItems = page.locator('[data-testid^="execution-history-item-"]');
            const count = await historyItems.count();
            expect(count).toBeGreaterThanOrEqual(2);
        });
    });

    test("should show real-time node status updates", async ({ page }) => {
        // Create a chain-of-thought workflow (has multiple LLM nodes)
        await page.goto("/workflows");

        await page.click('[data-testid="create-workflow-button"]');
        await page.fill('[data-testid="workflow-name-input"]', "Status Update Test");
        await page.click('[data-testid="pattern-chain-of-thought"]');
        await page.click('[data-testid="create-workflow-submit"]');
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        // Execute
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        await page.fill('[data-testid^="execution-input-"]', "Test problem");
        await page.click('[data-testid="start-execution-button"]');

        // Watch for sequential status updates
        // First node should complete before second starts
        await test.step("Verify sequential execution", async () => {
            // Wait for first node to complete
            await page.waitForSelector('[data-testid="node-status-completed"]', {
                timeout: 30000
            });

            // Eventually all should complete
            await page.waitForSelector('[data-testid="execution-complete"]', {
                timeout: 120000
            });

            const completedNodes = page.locator('[data-testid="node-status-completed"]');
            const count = await completedNodes.count();
            expect(count).toBe(5); // Chain of thought has 5 nodes
        });
    });

    test("should display node outputs during execution", async ({ page }) => {
        await page.goto("/workflows");

        await page.click('[data-testid="create-workflow-button"]');
        await page.fill('[data-testid="workflow-name-input"]', "Output Display Test");
        await page.click('[data-testid="pattern-simple-chat"]');
        await page.click('[data-testid="create-workflow-submit"]');
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        // Execute
        await page.click('[data-testid="execute-workflow-button"]');
        await page.waitForSelector('[data-testid="execution-dialog"]');

        await page.fill('[data-testid^="execution-input-"]', "Hello!");
        await page.click('[data-testid="start-execution-button"]');

        // Wait for at least one node to complete
        await page.waitForSelector('[data-testid="node-status-completed"]', {
            timeout: 30000
        });

        // Click on completed node to see output
        await page.click('[data-testid="node-status-completed"]');

        // Should show output panel
        const outputPanel = page.locator('[data-testid="node-output-panel"]');
        await expect(outputPanel).toBeVisible({ timeout: 5000 });

        // Output should have content
        const outputContent = await outputPanel.textContent();
        expect(outputContent?.length).toBeGreaterThan(0);
    });
});
