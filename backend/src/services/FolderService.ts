import { NotFoundError } from "../api/middleware";
import { FolderRepository } from "../storage/repositories/FolderRespository";

export class FolderService {
    private folderRepo: FolderRepository;

    constructor() {
        this.folderRepo = new FolderRepository();
    }

    async moveItems(
        userId: string,
        itemIds: string[],
        itemType: "workflow" | "agent" | "form-interface" | "chat-interface" | "knowledge-base",
        folderId: string | null
    ): Promise<void> {
        // Verify folder ownership (if folderId provided)
        if (folderId) {
            const folder = await this.folderRepo.findById(folderId, userId);
            if (!folder) {
                throw new NotFoundError("Folder not found");
            }
        }

        // Update items based on type
        const repo = this.getRepositoryForType(itemType);
        await repo.updateFolderId(itemIds, userId, folderId);
    }

    private getRepositoryForType(
        itemType: "workflow" | "agent" | "form-interface" | "chat-interface" | "knowledge-base"
    ): {
        updateFolderId: (
            itemIds: string[],
            userId: string,
            folderId: string | null
        ) => Promise<void>;
    } {
        switch (itemType) {
            case "workflow":
                return {
                    updateFolderId: async (_itemIds, _userId, _folderId) => {
                        // TODO: Implement updateFolderId
                        throw new Error("Not implemented yet");
                    }
                };
            case "agent":
                return {
                    updateFolderId: async (_itemIds, _userId, _folderId) => {
                        // TODO: Implement updateFolderId
                        throw new Error("Not implemented yet");
                    }
                };
            case "form-interface":
                return {
                    updateFolderId: async (_itemIds, _userId, _folderId) => {
                        // TODO: Implement updateFolderId
                        throw new Error("Not implemented yet");
                    }
                };
            case "chat-interface":
                return {
                    updateFolderId: async (_itemIds, _userId, _folderId) => {
                        // TODO: Implement updateFolderId
                        throw new Error("Not implemented yet");
                    }
                };
            case "knowledge-base":
                return {
                    updateFolderId: async (_itemIds, _userId, _folderId) => {
                        // TODO: Implement updateFolderId
                        throw new Error("Not implemented yet");
                    }
                };
            default:
                throw new Error(`Unknown item type: ${itemType}`);
        }
    }
}
