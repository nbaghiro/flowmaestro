/**
 * Integration Test: Input File Upload
 * Verifies Input node accepts file-like input and propagates it downstream.
 */

import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import workflowDefinition from "../../fixtures/workflows/09-input-file-upload.json";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

describe("Input Workflow: File Upload", () => {
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

    it("should pass a file input through to the output template", async () => {
        const fakePdfBase64 = "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrAQ==";

        const result = await testHarness.executeWorkflow(workflowDefinition, {
            uploadedFile: fakePdfBase64
        });

        expect(result.success).toBe(true);
        expect(result.outputs.result).toBeDefined();

        const output = String(result.outputs.result);
        expect(output).toContain("Uploaded file variable:");
        expect(output).toContain(fakePdfBase64);
        expect(output).toContain("tag: pdf_upload");
    });
});
