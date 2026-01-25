import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SendGridValidationOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const validateEmailSchema = z.object({
    email: z.string().email().describe("The email address to validate"),
    source: z.string().optional().describe("Source identifier for tracking validation requests")
});

export type ValidateEmailParams = z.infer<typeof validateEmailSchema>;

export const validateEmailOperation: OperationDefinition = {
    id: "validateEmail",
    name: "Validate Email",
    description: "Validate an email address using SendGrid Email Validation API",
    category: "validation",
    inputSchema: validateEmailSchema,
    inputSchemaJSON: toJSONSchema(validateEmailSchema),
    retryable: true,
    timeout: 15000
};

export async function executeValidateEmail(
    client: SendGridClient,
    params: ValidateEmailParams
): Promise<OperationResult> {
    try {
        const response = await client.validateEmail(params.email, params.source);

        const output: SendGridValidationOutput = {
            email: response.result.email,
            verdict: response.result.verdict,
            score: response.result.score,
            local: response.result.local,
            host: response.result.host,
            suggestion: response.result.suggestion,
            hasValidSyntax: response.result.checks.domain.has_valid_address_syntax,
            hasMxRecord: response.result.checks.domain.has_mx_or_a_record,
            isDisposable: response.result.checks.domain.is_suspected_disposable_address,
            isRoleAddress: response.result.checks.local_part.is_suspected_role_address,
            hasKnownBounces: response.result.checks.additional.has_known_bounces
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to validate email",
                retryable: true
            }
        };
    }
}
