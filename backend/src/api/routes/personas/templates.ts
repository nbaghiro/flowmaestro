import { z } from "zod";
import type { PersonaInputField } from "@flowmaestro/shared";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaTaskTemplateRepository } from "../../../storage/repositories/PersonaTaskTemplateRepository";
import type { FastifyRequest, FastifyReply } from "fastify";

// =============================================================================
// Validation Schemas
// =============================================================================

const getTemplatesParamsSchema = z.object({
    slug: z.string().min(1).max(100)
});

const generateFromTemplateParamsSchema = z.object({
    slug: z.string().min(1).max(100),
    templateId: z.string().uuid()
});

const generateFromTemplateBodySchema = z.object({
    variables: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
});

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/personas/:slug/templates
 * List all active templates for a persona
 */
export async function listTemplatesHandler(
    request: FastifyRequest<{
        Params: { slug: string };
    }>,
    reply: FastifyReply
): Promise<void> {
    const { slug } = getTemplatesParamsSchema.parse(request.params);

    // Verify persona exists
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findBySlug(slug);

    if (!persona) {
        reply.code(404).send({
            success: false,
            error: "Persona not found"
        });
        return;
    }

    // Get templates
    const templateRepo = new PersonaTaskTemplateRepository();
    const templates = await templateRepo.findByPersonaSlug(slug, "active");

    reply.send({
        success: true,
        data: {
            templates
        }
    });
}

/**
 * POST /api/personas/:slug/templates/:templateId/generate
 * Generate task description from a template with provided variables
 */
export async function generateFromTemplateHandler(
    request: FastifyRequest<{
        Params: { slug: string; templateId: string };
        Body: { variables: Record<string, string | number | boolean | string[]> };
    }>,
    reply: FastifyReply
): Promise<void> {
    const params = generateFromTemplateParamsSchema.parse(request.params);
    const body = generateFromTemplateBodySchema.parse(request.body);

    // Verify persona exists
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findBySlug(params.slug);

    if (!persona) {
        reply.code(404).send({
            success: false,
            error: "Persona not found"
        });
        return;
    }

    // Get template
    const templateRepo = new PersonaTaskTemplateRepository();
    const template = await templateRepo.findById(params.templateId);

    if (!template) {
        reply.code(404).send({
            success: false,
            error: "Template not found"
        });
        return;
    }

    // Verify template belongs to this persona
    if (template.persona_definition_id !== persona.id) {
        reply.code(404).send({
            success: false,
            error: "Template not found for this persona"
        });
        return;
    }

    // Validate required variables
    const missingRequired: string[] = [];
    for (const variable of template.variables) {
        if (variable.required && body.variables[variable.name] === undefined) {
            missingRequired.push(variable.name);
        }
    }

    if (missingRequired.length > 0) {
        reply.code(400).send({
            success: false,
            error: `Missing required variables: ${missingRequired.join(", ")}`
        });
        return;
    }

    // Generate task description from template
    const taskDescription = generateTaskDescription(
        template.task_template,
        template.variables,
        body.variables
    );

    reply.send({
        success: true,
        data: {
            task_description: taskDescription,
            suggested_duration_hours: template.suggested_duration_hours,
            suggested_max_cost: template.suggested_max_cost
        }
    });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate task description by substituting variables into template
 */
function generateTaskDescription(
    templateText: string,
    variableDefinitions: PersonaInputField[],
    variableValues: Record<string, string | number | boolean | string[]>
): string {
    let result = templateText;

    // Create a map of variable definitions for easy lookup
    const defMap = new Map(variableDefinitions.map((v) => [v.name, v]));

    // Process each variable
    for (const [name, value] of Object.entries(variableValues)) {
        const def = defMap.get(name);

        // Format the value based on type
        let formattedValue: string;

        if (Array.isArray(value)) {
            // For arrays (multiselect, tags), join with commas or format as list
            if (def?.type === "multiselect" && def.options) {
                // Map values to labels if options are provided
                const labels = value.map((v) => {
                    const option = def.options?.find((o) => o.value === v);
                    return option?.label || v;
                });
                formattedValue = labels.join(", ");
            } else {
                formattedValue = value.join(", ");
            }
        } else if (typeof value === "boolean") {
            formattedValue = value ? "Yes" : "No";
        } else if (def?.type === "select" && def.options) {
            // Map value to label for select fields
            const option = def.options.find((o) => o.value === String(value));
            formattedValue = option?.label || String(value);
        } else {
            formattedValue = String(value);
        }

        // Replace {{variable}} placeholders
        const placeholder = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g");
        result = result.replace(placeholder, formattedValue);
    }

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = processConditionalBlocks(result, variableValues);

    // Handle list blocks {{#each variable}}...{{/each}}
    result = processListBlocks(result, variableValues);

    // Clean up any remaining unsubstituted placeholders for optional variables
    result = result.replace(/\{\{\s*\w+\s*\}\}/g, "");

    // Clean up multiple consecutive newlines
    result = result.replace(/\n{3,}/g, "\n\n");

    return result.trim();
}

/**
 * Process conditional blocks in template
 * {{#if variable}}content{{/if}}
 */
function processConditionalBlocks(
    template: string,
    variables: Record<string, string | number | boolean | string[]>
): string {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (_match, varName, content) => {
        const value = variables[varName];
        // Show content if value is truthy and not empty
        const shouldShow =
            value !== undefined &&
            value !== null &&
            value !== false &&
            value !== "" &&
            !(Array.isArray(value) && value.length === 0);

        return shouldShow ? content : "";
    });
}

/**
 * Process list blocks in template
 * {{#each variable}}{{this}}{{/each}}
 */
function processListBlocks(
    template: string,
    variables: Record<string, string | number | boolean | string[]>
): string {
    const listRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(listRegex, (_match, varName, itemTemplate) => {
        const value = variables[varName];

        if (!Array.isArray(value) || value.length === 0) {
            return "";
        }

        return value
            .map((item) => {
                return itemTemplate.replace(/\{\{\s*this\s*\}\}/g, String(item));
            })
            .join("");
    });
}
