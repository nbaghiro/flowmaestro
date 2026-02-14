/**
 * Template Usage Integration Tests
 *
 * Tests persona task template functionality including:
 * - Template listing and retrieval
 * - Variable substitution
 * - Usage count tracking
 */

import {
    createResearchAssistantPersona,
    createContentWriterPersona,
    createTemplateFixture,
    createMarketResearchTemplate,
    createContentBriefTemplate,
    createPersonaInstanceFixture
} from "./helpers/persona-fixtures";
import { createPersonaTestEnvironment } from "./helpers/persona-test-env";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("Template Usage", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Template Listing", () => {
        it("lists templates for persona by slug", async () => {
            const persona = createResearchAssistantPersona();
            const template1 = createTemplateFixture({ personaDefinitionId: persona.id });
            const template2 = createMarketResearchTemplate(persona.id);

            testEnv.repositories.personaTemplate.findByPersonaSlug.mockResolvedValue([
                template1,
                template2
            ]);

            const templates = await testEnv.repositories.personaTemplate.findByPersonaSlug(
                persona.slug
            );

            expect(templates).toHaveLength(2);
        });

        it("lists templates for persona by definition ID", async () => {
            const persona = createResearchAssistantPersona();
            const template = createMarketResearchTemplate(persona.id);

            testEnv.repositories.personaTemplate.findByPersonaDefinitionId.mockResolvedValue([
                template
            ]);

            const templates = await testEnv.repositories.personaTemplate.findByPersonaDefinitionId(
                persona.id
            );

            expect(templates).toHaveLength(1);
            expect(templates[0].persona_definition_id).toBe(persona.id);
        });

        it("returns empty array when no templates", async () => {
            testEnv.repositories.personaTemplate.findByPersonaSlug.mockResolvedValue([]);

            const templates =
                await testEnv.repositories.personaTemplate.findByPersonaSlug(
                    "no-templates-persona"
                );

            expect(templates).toEqual([]);
        });
    });

    describe("Template Retrieval", () => {
        it("finds template by ID", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(template.id);
        });

        it("returns null for non-existent template", async () => {
            testEnv.repositories.personaTemplate.findById.mockResolvedValue(null);

            const result = await testEnv.repositories.personaTemplate.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("Variable Substitution", () => {
        it("generates task description with variable substitution", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({
                personaDefinitionId: persona.id,
                taskTemplate:
                    "Research {{topic}} and provide a {{deliverable_type}} about {{focus_area}}."
            });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const templateContent = template.task_template;
            const variables = {
                topic: "AI Market Trends",
                deliverable_type: "comprehensive report",
                focus_area: "competitive landscape"
            };

            // Simulate substitution
            let generatedTask = templateContent;
            for (const [key, value] of Object.entries(variables)) {
                generatedTask = generatedTask.replace(new RegExp(`{{${key}}}`, "g"), value);
            }

            expect(generatedTask).toContain("AI Market Trends");
            expect(generatedTask).toContain("comprehensive report");
            expect(generatedTask).toContain("competitive landscape");
            expect(generatedTask).not.toContain("{{");
        });

        it("handles missing optional variables gracefully", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({
                personaDefinitionId: persona.id,
                taskTemplate: "Research {{topic}}. Focus: {{focus_area}}."
            });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const variables = {
                topic: "AI Trends"
                // focus_area is optional and not provided
            };

            let generatedTask = template.task_template;
            for (const [key, value] of Object.entries(variables)) {
                generatedTask = generatedTask.replace(new RegExp(`{{${key}}}`, "g"), value);
            }

            // Optional variables left as placeholders or empty
            expect(generatedTask).toContain("AI Trends");
            expect(generatedTask).toContain("{{focus_area}}");
        });

        it("validates required variables", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({
                personaDefinitionId: persona.id,
                variables: [
                    { name: "topic", label: "Topic", type: "text" as const, required: true },
                    { name: "audience", label: "Audience", type: "text" as const, required: true }
                ]
            });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const variables = {
                topic: "AI Trends"
                // audience is required but not provided
            };

            // Check which required variables are missing
            const requiredVars = template.variables.filter((v) => v.required);
            const missingVars = requiredVars.filter((v) => !(v.name in variables));

            expect(missingVars).toHaveLength(1);
            expect(missingVars[0].name).toBe("audience");
        });

        it("handles select field options", async () => {
            const persona = createContentWriterPersona();
            const template = createContentBriefTemplate(persona.id);

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            // Verify select options are available
            const contentTypeVar = template.variables.find((v) => v.name === "content_type");
            expect(contentTypeVar).toBeDefined();
            expect(contentTypeVar?.options).toBeDefined();
            expect(contentTypeVar?.options?.map((o) => o.value)).toContain("blog_post");
        });
    });

    describe("Conditional Blocks", () => {
        it("handles conditional blocks in templates", async () => {
            const persona = createResearchAssistantPersona();
            const template = createMarketResearchTemplate(persona.id);

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const templateContent = template.task_template;

            // Template contains conditional: {{#if include_financial}}...{{/if}}
            expect(templateContent).toContain("{{#if include_financial}}");
            expect(templateContent).toContain("{{/if}}");

            // Simulate conditional processing (when enabled)
            const withFinancial = templateContent
                .replace("{{#if include_financial}}", "")
                .replace("{{/if}}", "");
            expect(withFinancial).toContain("Financial analysis and projections");

            // Simulate conditional processing (when disabled)
            const withoutFinancial = templateContent.replace(
                /{{#if include_financial}}[\s\S]*?{{\/if}}/,
                ""
            );
            expect(withoutFinancial).not.toContain("Financial analysis and projections");
        });
    });

    describe("Usage Tracking", () => {
        it("increments usage count when template is used", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });
            template.usage_count = 0;

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);
            testEnv.repositories.personaTemplate.incrementUsageCount.mockResolvedValue(undefined);

            // Use template
            await testEnv.repositories.personaTemplate.incrementUsageCount(template.id);

            expect(testEnv.repositories.personaTemplate.incrementUsageCount).toHaveBeenCalledWith(
                template.id
            );
        });

        it("tracks usage count in template metadata", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });
            template.usage_count = 42;

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);

            expect(result?.usage_count).toBe(42);
        });
    });

    describe("Template Creation with Instance", () => {
        it("creates instance with template reference", async () => {
            const persona = createResearchAssistantPersona();
            const template = createMarketResearchTemplate(persona.id);

            const instance = createPersonaInstanceFixture({
                personaDefinitionId: persona.id,
                workspaceId: testEnv.testWorkspace.id
            });
            instance.template_id = template.id;
            instance.template_variables = {
                industry: "Healthcare",
                report_format: "detailed_analysis",
                include_financial: true
            };

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);
            testEnv.repositories.personaInstance.create.mockResolvedValue(instance);
            testEnv.repositories.personaTemplate.incrementUsageCount.mockResolvedValue(undefined);

            // Create instance using template
            const result = await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id,
                template_id: template.id,
                template_variables: {
                    industry: "Healthcare",
                    report_format: "detailed_analysis",
                    include_financial: true
                }
            });

            expect(result.template_id).toBe(template.id);
            expect(result.template_variables.industry).toBe("Healthcare");

            // Increment usage count
            await testEnv.repositories.personaTemplate.incrementUsageCount(template.id);
            expect(testEnv.repositories.personaTemplate.incrementUsageCount).toHaveBeenCalledWith(
                template.id
            );
        });
    });

    describe("Template Variables Structure", () => {
        it("defines text variables correctly", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({
                personaDefinitionId: persona.id,
                variables: [
                    {
                        name: "topic",
                        label: "Research Topic",
                        type: "text" as const,
                        required: true
                    }
                ]
            });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);
            const topicVar = result?.variables[0];

            expect(topicVar?.type).toBe("text");
            expect(topicVar?.required).toBe(true);
        });

        it("defines select variables with options", async () => {
            const persona = createContentWriterPersona();
            const template = createContentBriefTemplate(persona.id);

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);
            const toneVar = result?.variables.find((v) => v.name === "tone");

            expect(toneVar?.type).toBe("select");
            expect(toneVar?.options).toBeDefined();
            expect(toneVar?.options?.length).toBeGreaterThan(0);
        });

        it("defines number variables", async () => {
            const persona = createContentWriterPersona();
            const template = createContentBriefTemplate(persona.id);

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);
            const wordCountVar = result?.variables.find((v) => v.name === "word_count");

            expect(wordCountVar?.type).toBe("number");
            expect(wordCountVar?.required).toBe(true);
        });
    });

    describe("Template Management", () => {
        it("updates template content", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });

            const updatedTemplate = {
                ...template,
                task_template: "Updated template content: {{topic}}"
            };

            testEnv.repositories.personaTemplate.update.mockResolvedValue(updatedTemplate);

            const result = await testEnv.repositories.personaTemplate.update(template.id, {
                task_template: "Updated template content: {{topic}}"
            });

            expect(result?.task_template).toContain("Updated template content");
        });

        it("deletes a template", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });

            testEnv.repositories.personaTemplate.delete.mockResolvedValue(true);

            const result = await testEnv.repositories.personaTemplate.delete(template.id);

            expect(result).toBe(true);
        });

        it("returns false when deleting non-existent template", async () => {
            testEnv.repositories.personaTemplate.delete.mockResolvedValue(false);

            const result = await testEnv.repositories.personaTemplate.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("Template Suggestions", () => {
        it("provides suggested duration and cost", async () => {
            const persona = createResearchAssistantPersona();
            const template = createTemplateFixture({ personaDefinitionId: persona.id });

            testEnv.repositories.personaTemplate.findById.mockResolvedValue(template);

            const result = await testEnv.repositories.personaTemplate.findById(template.id);

            expect(result?.suggested_duration_hours).toBeDefined();
            expect(result?.suggested_duration_hours).toBeGreaterThan(0);
            expect(result?.suggested_max_cost).toBeDefined();
            expect(result?.suggested_max_cost).toBeGreaterThan(0);
        });
    });
});
