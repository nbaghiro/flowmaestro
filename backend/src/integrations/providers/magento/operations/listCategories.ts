import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { ListCategoriesSchema, type ListCategoriesParams } from "../schemas";
import type { MagentoCategory } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listCategoriesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCategories",
            name: "List Categories",
            description: "Retrieve the category tree structure from Magento",
            category: "categories",
            inputSchema: ListCategoriesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create listCategoriesOperation"
        );
        throw new Error(
            `Failed to create listCategories operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListCategories(
    client: MagentoClient,
    params: ListCategoriesParams
): Promise<OperationResult> {
    try {
        const response = await client.getCategoryTree(params.root_category_id, params.depth);
        const category = response as MagentoCategory;

        // Flatten the category tree for easier consumption
        const flattenCategories = (
            cat: MagentoCategory,
            result: MagentoCategory[] = []
        ): MagentoCategory[] => {
            const { children_data, ...categoryData } = cat;
            result.push(categoryData as MagentoCategory);
            if (children_data) {
                for (const child of children_data) {
                    flattenCategories(child, result);
                }
            }
            return result;
        };

        const categories = flattenCategories(category);

        return {
            success: true,
            data: {
                categories,
                root_category: category,
                total_count: categories.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list categories",
                retryable: true
            }
        };
    }
}
