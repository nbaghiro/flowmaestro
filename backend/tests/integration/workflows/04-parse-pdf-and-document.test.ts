import { Pool } from "pg";
import { getGlobalTestPool } from "../../../jest.setup";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";
import workflowDefinition from "../fixtures/workflows/04-parse-pdf-and-document.json";

describe("Parse PDF + Document flow (base64 inputs → parsed outputs)", () => {
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

    it("parses both PDF and DOCX and returns expected text/metadata", async () => {
        const result = await testHarness.executeWorkflow(workflowDefinition, {});

        expect(result.success).toBe(true);

        type ParsedPdf = {
            text: string;
            pages: Array<{ pageNumber: number; text: string }>;
            metadata: { pageCount: number };
        };
        type ParsedDoc = {
            text: string;
            sections: Array<{ type: string; content: string }>;
            metadata: { fileType: string };
        };

        const parsedPdf =
            (result.outputs.parsedPdf as ParsedPdf | undefined) ||
            (result.outputs.combinedResult as { parsedPdf?: ParsedPdf } | undefined)?.parsedPdf ||
            (result.outputs.combinedResult as ParsedPdf | undefined);

        const parsedDoc =
            (result.outputs.parsedDoc as ParsedDoc | undefined) ||
            (result.outputs.combinedResult as { parsedDoc?: ParsedDoc } | undefined)?.parsedDoc ||
            (result.outputs.combinedResult as ParsedDoc | undefined);

        expect(parsedPdf).toBeTruthy();
        expect(parsedDoc).toBeTruthy();
        if (!parsedPdf || !parsedDoc) return;

        expect(parsedPdf.text).toContain("Invoice 123");
        expect(parsedPdf.text).toContain("Amount: $10.00");
        expect(parsedPdf.pages.length).toBeGreaterThan(0);
        expect(parsedPdf.metadata.pageCount).toBeGreaterThan(0);

        expect(parsedDoc.text).toContain("Service Contract");
        expect(parsedDoc.text).toContain("basic terms");
        expect(parsedDoc.sections.length).toBeGreaterThan(0);
        expect(parsedDoc.metadata.fileType).toBe("docx");
    });
});
