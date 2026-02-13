import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { ValidateAddressSchema, type ValidateAddressParams } from "../schemas";
import type { ShippoAddress } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const validateAddressOperation: OperationDefinition = (() => {
    try {
        return {
            id: "validateAddress",
            name: "Validate Address",
            description: "Validate a shipping address and get standardized format",
            category: "addresses",
            inputSchema: ValidateAddressSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create validateAddressOperation"
        );
        throw new Error(
            `Failed to create validateAddress operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeValidateAddress(
    client: ShippoClient,
    params: ValidateAddressParams
): Promise<OperationResult> {
    try {
        const response = await client.validateAddress({
            name: params.name,
            company: params.company,
            street1: params.street1,
            street2: params.street2,
            city: params.city,
            state: params.state,
            zip: params.zip,
            country: params.country,
            phone: params.phone,
            email: params.email,
            is_residential: params.is_residential,
            validate: params.validate
        });

        const address = response as ShippoAddress;

        return {
            success: true,
            data: {
                address,
                address_id: address.object_id,
                is_valid: address.validation_results?.is_valid ?? address.is_complete,
                validation_messages: address.validation_results?.messages || []
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to validate address",
                retryable: true
            }
        };
    }
}
