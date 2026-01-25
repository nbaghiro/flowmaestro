import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SentryAlertRuleOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listAlertRulesSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    projectSlug: z.string().min(1).describe("Project identifier")
});

export type ListAlertRulesParams = z.infer<typeof listAlertRulesSchema>;

export const listAlertRulesOperation: OperationDefinition = {
    id: "listAlertRules",
    name: "List Alert Rules",
    description: "List alert rules for a project",
    category: "alerts",
    inputSchema: listAlertRulesSchema,
    inputSchemaJSON: toJSONSchema(listAlertRulesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListAlertRules(
    client: SentryClient,
    params: ListAlertRulesParams
): Promise<OperationResult> {
    try {
        const rules = await client.listAlertRules(params.organizationSlug, params.projectSlug);

        const formattedRules: SentryAlertRuleOutput[] = rules.map((r) => ({
            id: r.id,
            name: r.name,
            dateCreated: r.dateCreated,
            status: r.status,
            environment: r.environment,
            frequency: r.frequency
        }));

        return {
            success: true,
            data: {
                rules: formattedRules,
                count: formattedRules.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list alert rules",
                retryable: true
            }
        };
    }
}
