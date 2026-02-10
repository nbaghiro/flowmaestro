import type { FolderResourceType, FolderWithCounts } from "@flowmaestro/shared";
import { getFolderContents } from "./api";
import { logger } from "./logger";

/**
 * Extract folder ID from a URL pathname.
 * Handles paths like /folders/:id and /folders/:id/items
 */
export function extractFolderIdFromPath(pathname: string): string | null {
    if (pathname.startsWith("/folders/")) {
        return pathname.split("/folders/")[1]?.split("/")[0] || null;
    }
    return null;
}

/**
 * Helper function to extract item IDs by type from folder items
 */
function getItemsForType(
    items: {
        workflows?: Array<{ id: string }>;
        agents?: Array<{ id: string }>;
        formInterfaces?: Array<{ id: string }>;
        chatInterfaces?: Array<{ id: string }>;
        knowledgeBases?: Array<{ id: string }>;
    },
    itemType: FolderResourceType
): string[] {
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
}

/**
 * Helper function to check if items exist in a folder's items (not subfolders)
 */
function checkItemsInFolderOnly(
    items: {
        workflows?: Array<{ id: string }>;
        agents?: Array<{ id: string }>;
        formInterfaces?: Array<{ id: string }>;
        chatInterfaces?: Array<{ id: string }>;
        knowledgeBases?: Array<{ id: string }>;
    },
    itemIds: string[],
    itemType: FolderResourceType,
    folderName: string,
    folderId: string
): { found: boolean; folderName: string; folderId: string; isInMainFolder: boolean } {
    const folderItemIds = getItemsForType(items, itemType);
    const foundInFolder = itemIds.some((id) => folderItemIds.includes(id));

    if (foundInFolder) {
        return {
            found: true,
            folderName,
            folderId,
            isInMainFolder: true
        };
    }

    return { found: false, folderName: "", folderId: "", isInMainFolder: false };
}

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
        const folderCheck = checkItemsInFolderOnly(
            items,
            itemIds,
            itemType,
            folder.name || "Unknown",
            folder.id
        );

        if (folderCheck.found) {
            // Item found in the main folder (not in a subfolder)
            return folderCheck;
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

        // Also check parent folder and sibling subfolders (if this folder has a parent)
        // This prevents moving an item from the main folder to a subfolder, or from one subfolder to another sibling subfolder
        // We check siblings recursively but avoid checking siblings of siblings to prevent loops
        if ("ancestors" in folder && folder.ancestors && folder.ancestors.length > 0) {
            const parentFolder = folder.ancestors[folder.ancestors.length - 1];
            if (parentFolder && parentFolder.id) {
                try {
                    const parentResponse = await getFolderContents(parentFolder.id);
                    if (parentResponse.data && parentResponse.success) {
                        const { items: parentItems, folder: parentFolderData } =
                            parentResponse.data;

                        // First, check if items exist in the parent folder itself (main folder)
                        if (parentItems) {
                            const parentCheck = checkItemsInFolderOnly(
                                parentItems,
                                itemIds,
                                itemType,
                                parentFolderData?.name || "Unknown",
                                parentFolder.id
                            );

                            if (parentCheck.found) {
                                // Item found in the parent folder (main folder)
                                return parentCheck;
                            }
                        }

                        // Then check all sibling subfolders (excluding the target folder itself)
                        // Use a helper function that checks recursively but doesn't check siblings again
                        const parentSubfolders = parentResponse.data.subfolders || [];
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
                    // If we can't check parent/siblings, continue (don't block the operation)
                    logger.error("Error checking parent and sibling folders", error);
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
        const folderCheck = checkItemsInFolderOnly(
            items,
            itemIds,
            itemType,
            folder.name || "Unknown",
            folder.id
        );

        if (folderCheck.found) {
            // Item found in the main folder
            return folderCheck;
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

/**
 * Calculate the total count of items of a specific type in a folder,
 * including all items in subfolders recursively.
 */
export function getFolderCountIncludingSubfolders(
    folder: FolderWithCounts,
    itemType: FolderResourceType,
    getFolderChildren: (folderId: string) => FolderWithCounts[]
): number {
    const getCountForType = (f: FolderWithCounts): number => {
        switch (itemType) {
            case "workflow":
                return f.itemCounts.workflows;
            case "agent":
                return f.itemCounts.agents;
            case "form-interface":
                return f.itemCounts.formInterfaces;
            case "chat-interface":
                return f.itemCounts.chatInterfaces;
            case "knowledge-base":
                return f.itemCounts.knowledgeBases;
        }
    };

    let total = getCountForType(folder);

    // Recursively add counts from all subfolders
    const children = getFolderChildren(folder.id);
    for (const child of children) {
        total += getFolderCountIncludingSubfolders(child, itemType, getFolderChildren);
    }

    return total;
}
