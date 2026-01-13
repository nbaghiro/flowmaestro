import type { FolderResourceType } from "@flowmaestro/shared";
import { getFolderContents } from "./api";
import { logger } from "./logger";

/**
 * Check if items are already in a folder (recursively checking subfolders)
 * This is a PRIORITY check that runs BEFORE any move operation
 */
export async function checkItemsInFolder(
    targetFolderId: string,
    itemIds: string[],
    itemType: FolderResourceType
): Promise<{ found: boolean; folderName: string; folderId: string; isInMainFolder: boolean }> {
    try {
        const response = await getFolderContents(targetFolderId);

        if (!response.data || !response.success) {
            return { found: false, folderName: "", folderId: "", isInMainFolder: false };
        }

        const { folder, items, subfolders = [] } = response.data;

        if (!folder || !items) {
            return { found: false, folderName: "", folderId: "", isInMainFolder: false };
        }

        // Check items in the main folder
        const getItemsForType = (): string[] => {
            switch (itemType) {
                case "workflow":
                    return items.workflows?.map((w) => w.id) || [];
                case "agent":
                    return items.agents?.map((a) => a.id) || [];
                case "form-interface":
                    return items.formInterfaces?.map((f) => f.id) || [];
                case "chat-interface":
                    return items.chatInterfaces?.map((c) => c.id) || [];
                case "knowledge-base":
                    return items.knowledgeBases?.map((k) => k.id) || [];
                default:
                    return [];
            }
        };

        const folderItemIds = getItemsForType();
        const foundInFolder = itemIds.some((id) => folderItemIds.includes(id));

        if (foundInFolder) {
            // Item found in the main folder (not in a subfolder)
            return {
                found: true,
                folderName: folder.name || "Unknown",
                folderId: folder.id,
                isInMainFolder: true
            };
        }

        // Recursively check subfolders
        if (subfolders && subfolders.length > 0) {
            for (const subfolder of subfolders) {
                if (subfolder && subfolder.id) {
                    const result = await checkItemsInFolder(subfolder.id, itemIds, itemType);
                    if (result.found) {
                        // Item found in a subfolder
                        return { ...result, isInMainFolder: false };
                    }
                }
            }
        }

        // Also check sibling subfolders (if this folder has a parent)
        // This prevents moving an item from one subfolder to another sibling subfolder
        // We check siblings recursively but avoid checking siblings of siblings to prevent loops
        if ("ancestors" in folder && folder.ancestors && folder.ancestors.length > 0) {
            const parentFolder = folder.ancestors[folder.ancestors.length - 1];
            if (parentFolder && parentFolder.id) {
                try {
                    const parentResponse = await getFolderContents(parentFolder.id);
                    if (parentResponse.data && parentResponse.success) {
                        const parentSubfolders = parentResponse.data.subfolders || [];
                        // Check all sibling subfolders (excluding the target folder itself)
                        // Use a helper function that checks recursively but doesn't check siblings again
                        for (const sibling of parentSubfolders) {
                            if (sibling && sibling.id && sibling.id !== targetFolderId) {
                                const siblingResult = await checkItemsInFolderWithoutSiblings(
                                    sibling.id,
                                    itemIds,
                                    itemType
                                );
                                if (siblingResult.found) {
                                    // Item found in a sibling subfolder
                                    return { ...siblingResult, isInMainFolder: false };
                                }
                            }
                        }
                    }
                } catch (error) {
                    // If we can't check siblings, continue (don't block the operation)
                    logger.error("Error checking sibling folders", error);
                }
            }
        }

        return { found: false, folderName: "", folderId: "", isInMainFolder: false };
    } catch (error) {
        logger.error("Error checking if items are in folder", error);
        return { found: false, folderName: "", folderId: "", isInMainFolder: false };
    }
}

/**
 * Helper function to check items in a folder recursively but without checking siblings
 * This prevents infinite loops when checking sibling folders
 */
async function checkItemsInFolderWithoutSiblings(
    targetFolderId: string,
    itemIds: string[],
    itemType: FolderResourceType
): Promise<{ found: boolean; folderName: string; folderId: string; isInMainFolder: boolean }> {
    try {
        const response = await getFolderContents(targetFolderId);

        if (!response.data || !response.success) {
            return { found: false, folderName: "", folderId: "", isInMainFolder: false };
        }

        const { folder, items, subfolders = [] } = response.data;

        if (!folder || !items) {
            return { found: false, folderName: "", folderId: "", isInMainFolder: false };
        }

        // Check items in the main folder
        const getItemsForType = (): string[] => {
            switch (itemType) {
                case "workflow":
                    return items.workflows?.map((w) => w.id) || [];
                case "agent":
                    return items.agents?.map((a) => a.id) || [];
                case "form-interface":
                    return items.formInterfaces?.map((f) => f.id) || [];
                case "chat-interface":
                    return items.chatInterfaces?.map((c) => c.id) || [];
                case "knowledge-base":
                    return items.knowledgeBases?.map((k) => k.id) || [];
                default:
                    return [];
            }
        };

        const folderItemIds = getItemsForType();
        const foundInFolder = itemIds.some((id) => folderItemIds.includes(id));

        if (foundInFolder) {
            // Item found in the main folder
            return {
                found: true,
                folderName: folder.name || "Unknown",
                folderId: folder.id,
                isInMainFolder: true
            };
        }

        // Recursively check subfolders (but NOT siblings)
        if (subfolders && subfolders.length > 0) {
            for (const subfolder of subfolders) {
                if (subfolder && subfolder.id) {
                    const result = await checkItemsInFolderWithoutSiblings(
                        subfolder.id,
                        itemIds,
                        itemType
                    );
                    if (result.found) {
                        // Item found in a subfolder
                        return { ...result, isInMainFolder: false };
                    }
                }
            }
        }

        return { found: false, folderName: "", folderId: "", isInMainFolder: false };
    } catch (error) {
        logger.error("Error checking if items are in folder (without siblings)", error);
        return { found: false, folderName: "", folderId: "", isInMainFolder: false };
    }
}
