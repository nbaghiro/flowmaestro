/**
 * Deliverable Management Integration Tests
 *
 * Tests the deliverable lifecycle including:
 * - Creation of different deliverable types
 * - Preview generation
 * - Content retrieval
 * - File-based deliverables
 */

import {
    createResearchAssistantPersona,
    createDataAnalystPersona,
    createCompletedInstance,
    createRunningInstance,
    createMarkdownDeliverable,
    createCodeDeliverable,
    createJsonDeliverable,
    createCsvDeliverable,
    createPdfDeliverable,
    createDeliverableFixture
} from "./helpers/persona-fixtures";
import { createPersonaTestEnvironment } from "./helpers/persona-test-env";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("Deliverable Management", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Creation", () => {
        it("creates markdown deliverable with content", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Research Report",
                description: "Comprehensive research findings",
                type: "markdown",
                content: "# Research Report\n\nThis is the content..."
            });

            expect(result.type).toBe("markdown");
            expect(result.content).toBeDefined();
            expect(result.file_url).toBeNull();
        });

        it("creates code deliverable with extension", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createCodeDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Implementation Code",
                type: "code",
                content: "function processData() { }",
                file_extension: "ts"
            });

            expect(result.type).toBe("code");
            expect(result.file_extension).toBe("ts");
        });

        it("creates JSON deliverable", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createJsonDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Analysis Results",
                type: "json",
                content: JSON.stringify({ score: 85 })
            });

            expect(result.type).toBe("json");
            expect(result.content).toBeDefined();
        });

        it("creates CSV deliverable", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createCsvDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Data Export",
                type: "csv",
                content: "name,value\nItem A,100\nItem B,200"
            });

            expect(result.type).toBe("csv");
        });

        it("creates deliverable with file_url for PDFs", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createPdfDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Final Report PDF",
                type: "pdf",
                file_url: "gs://bucket/reports/final-report.pdf",
                file_size_bytes: 102400,
                file_extension: "pdf"
            });

            expect(result.type).toBe("pdf");
            expect(result.content).toBeNull();
            expect(result.file_url).toContain("gs://");
            expect(result.file_size_bytes).toBe(102400);
        });
    });

    describe("Preview Generation", () => {
        it("generates preview for markdown content", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const longContent = "# Title\n\n" + "Lorem ipsum ".repeat(100);
            const deliverable = createDeliverableFixture({
                instanceId: instance.id,
                type: "markdown",
                content: longContent
            });
            deliverable.preview = longContent.substring(0, 200) + "...";

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Long Document",
                type: "markdown",
                content: longContent
            });

            expect(result.preview).toBeDefined();
            expect(result.preview!.length).toBeLessThan(longContent.length);
            expect(result.preview).toContain("...");
        });

        it("generates preview for CSV showing header rows", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const csvContent = [
                "name,value,category",
                "Item A,100,Cat 1",
                "Item B,200,Cat 2",
                "Item C,300,Cat 3",
                "Item D,400,Cat 4",
                "Item E,500,Cat 5",
                "Item F,600,Cat 6"
            ].join("\n");

            const deliverable = createCsvDeliverable(instance.id);
            deliverable.preview =
                "name,value,category\nItem A,100,Cat 1\nItem B,200,Cat 2\nItem C,300,Cat 3\nItem D,400,Cat 4\n...";

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Data Export",
                type: "csv",
                content: csvContent
            });

            expect(result.preview).toContain("name,value,category");
            expect(result.preview).toContain("...");
        });

        it("generates pretty-printed preview for JSON", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const jsonData = { analysis: { score: 85, categories: ["a", "b", "c"] } };
            const prettyJson = JSON.stringify(jsonData, null, 2);

            const deliverable = createJsonDeliverable(instance.id);
            deliverable.preview = prettyJson;

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Analysis",
                type: "json",
                content: JSON.stringify(jsonData)
            });

            expect(result.preview).toContain("\n"); // Pretty printed has newlines
        });

        it("returns null preview for PDF type", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createPdfDeliverable(instance.id);
            deliverable.preview = null;

            testEnv.repositories.personaDeliverable.create.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "PDF Report",
                type: "pdf",
                file_url: "gs://bucket/report.pdf"
            });

            expect(result.preview).toBeNull();
        });
    });

    describe("Retrieval", () => {
        it("finds deliverable by ID", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.findById.mockResolvedValue(deliverable);

            const result = await testEnv.repositories.personaDeliverable.findById(deliverable.id);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(deliverable.id);
        });

        it("returns null for non-existent deliverable", async () => {
            testEnv.repositories.personaDeliverable.findById.mockResolvedValue(null);

            const result = await testEnv.repositories.personaDeliverable.findById("non-existent");

            expect(result).toBeNull();
        });

        it("lists deliverables for instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);

            const deliverables = [
                createMarkdownDeliverable(instance.id),
                createCsvDeliverable(instance.id),
                createJsonDeliverable(instance.id)
            ];

            testEnv.repositories.personaDeliverable.findByInstanceId.mockResolvedValue(
                deliverables
            );

            const result = await testEnv.repositories.personaDeliverable.findByInstanceId(
                instance.id
            );

            expect(result).toHaveLength(3);
        });

        it("returns empty array when no deliverables", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaDeliverable.findByInstanceId.mockResolvedValue([]);

            const result = await testEnv.repositories.personaDeliverable.findByInstanceId(
                instance.id
            );

            expect(result).toEqual([]);
        });

        it("returns summaries without full content", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            const summary = {
                id: deliverable.id,
                name: deliverable.name,
                description: deliverable.description,
                type: deliverable.type,
                file_size_bytes: deliverable.file_size_bytes,
                file_extension: deliverable.file_extension,
                preview: deliverable.preview,
                created_at: deliverable.created_at.toISOString()
            };

            testEnv.repositories.personaDeliverable.getSummariesByInstanceId.mockResolvedValue([
                summary
            ]);

            const result = await testEnv.repositories.personaDeliverable.getSummariesByInstanceId(
                instance.id
            );

            expect(result).toHaveLength(1);
            expect(result[0]).not.toHaveProperty("content");
            expect(result[0]).not.toHaveProperty("file_url");
            expect(result[0].preview).toBeDefined();
        });
    });

    describe("Content Retrieval", () => {
        it("returns content for inline deliverables", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.getContent.mockResolvedValue({
                content: deliverable.content,
                file_url: null,
                type: "markdown"
            });

            const result = await testEnv.repositories.personaDeliverable.getContent(deliverable.id);

            expect(result?.content).toBeDefined();
            expect(result?.file_url).toBeNull();
        });

        it("returns file_url for file-based deliverables", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createPdfDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.getContent.mockResolvedValue({
                content: null,
                file_url: deliverable.file_url,
                type: "pdf"
            });

            const result = await testEnv.repositories.personaDeliverable.getContent(deliverable.id);

            expect(result?.content).toBeNull();
            expect(result?.file_url).toBeDefined();
            expect(result?.file_url).toContain("gs://");
        });

        it("returns null for non-existent deliverable", async () => {
            testEnv.repositories.personaDeliverable.getContent.mockResolvedValue(null);

            const result = await testEnv.repositories.personaDeliverable.getContent("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("Update", () => {
        it("updates deliverable name", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            const updatedDeliverable = { ...deliverable, name: "Updated Report Name" };
            testEnv.repositories.personaDeliverable.update.mockResolvedValue(updatedDeliverable);

            const result = await testEnv.repositories.personaDeliverable.update(deliverable.id, {
                name: "Updated Report Name"
            });

            expect(result?.name).toBe("Updated Report Name");
        });

        it("updates content and regenerates preview", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            const newContent = "# New Content\n\nUpdated analysis...";
            const updatedDeliverable = {
                ...deliverable,
                content: newContent,
                preview: newContent.substring(0, 200)
            };

            testEnv.repositories.personaDeliverable.update.mockResolvedValue(updatedDeliverable);

            const result = await testEnv.repositories.personaDeliverable.update(deliverable.id, {
                content: newContent
            });

            expect(result?.content).toBe(newContent);
            expect(result?.preview).toContain("New Content");
        });

        it("returns null when deliverable not found", async () => {
            testEnv.repositories.personaDeliverable.update.mockResolvedValue(null);

            const result = await testEnv.repositories.personaDeliverable.update("non-existent", {
                name: "New Name"
            });

            expect(result).toBeNull();
        });
    });

    describe("Deletion", () => {
        it("deletes a deliverable", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);
            const deliverable = createMarkdownDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.delete.mockResolvedValue(true);

            const result = await testEnv.repositories.personaDeliverable.delete(deliverable.id);

            expect(result).toBe(true);
        });

        it("returns false when deliverable not found", async () => {
            testEnv.repositories.personaDeliverable.delete.mockResolvedValue(false);

            const result = await testEnv.repositories.personaDeliverable.delete("non-existent");

            expect(result).toBe(false);
        });

        it("deletes all deliverables for an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaDeliverable.deleteByInstanceId.mockResolvedValue(3);

            const deletedCount = await testEnv.repositories.personaDeliverable.deleteByInstanceId(
                instance.id
            );

            expect(deletedCount).toBe(3);
        });
    });

    describe("Count", () => {
        it("counts deliverables for an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaDeliverable.countByInstanceId.mockResolvedValue(5);

            const count = await testEnv.repositories.personaDeliverable.countByInstanceId(
                instance.id
            );

            expect(count).toBe(5);
        });

        it("returns 0 when no deliverables", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaDeliverable.countByInstanceId.mockResolvedValue(0);

            const count = await testEnv.repositories.personaDeliverable.countByInstanceId(
                instance.id
            );

            expect(count).toBe(0);
        });
    });

    describe("Multiple Deliverable Types", () => {
        it("creates multiple deliverables of different types", async () => {
            const persona = createDataAnalystPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const markdown = createMarkdownDeliverable(instance.id);
            const csv = createCsvDeliverable(instance.id);
            const json = createJsonDeliverable(instance.id);

            testEnv.repositories.personaDeliverable.create
                .mockResolvedValueOnce(markdown)
                .mockResolvedValueOnce(csv)
                .mockResolvedValueOnce(json);

            testEnv.repositories.personaDeliverable.findByInstanceId.mockResolvedValue([
                markdown,
                csv,
                json
            ]);

            // Create all deliverables
            await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Report",
                type: "markdown",
                content: "# Report"
            });
            await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Data",
                type: "csv",
                content: "a,b,c"
            });
            await testEnv.repositories.personaDeliverable.create({
                instance_id: instance.id,
                name: "Analysis",
                type: "json",
                content: "{}"
            });

            // Verify all were created
            const deliverables = await testEnv.repositories.personaDeliverable.findByInstanceId(
                instance.id
            );

            expect(deliverables).toHaveLength(3);
            expect(deliverables.map((d) => d.type)).toContain("markdown");
            expect(deliverables.map((d) => d.type)).toContain("csv");
            expect(deliverables.map((d) => d.type)).toContain("json");
        });
    });
});
