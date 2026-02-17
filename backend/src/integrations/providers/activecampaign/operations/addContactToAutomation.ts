import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const addContactToAutomationSchema = z.object({
    contactId: z.string().describe("The ID of the contact to add"),
    automationId: z.string().describe("The ID of the automation to add the contact to")
});

export type AddContactToAutomationParams = z.infer<typeof addContactToAutomationSchema>;

export const addContactToAutomationOperation: OperationDefinition = {
    id: "addContactToAutomation",
    name: "Add Contact to Automation",
    description: "Add a contact to an automation in ActiveCampaign",
    category: "automations",
    inputSchema: addContactToAutomationSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddContactToAutomation(
    client: ActiveCampaignClient,
    params: AddContactToAutomationParams
): Promise<OperationResult> {
    try {
        const response = await client.addContactToAutomation(params.contactId, params.automationId);

        return {
            success: true,
            data: {
                added: true,
                contactId: response.contactAutomation.contact,
                automationId: response.contactAutomation.automation
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to add contact to automation";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
