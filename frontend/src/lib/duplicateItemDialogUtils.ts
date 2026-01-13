import type { FolderResourceType } from "@flowmaestro/shared";
import { useDuplicateItemDialogStore } from "../stores/duplicateItemDialogStore";

// Utility function to show duplicate item warning dialog
export function showDuplicateItemWarning(warning: {
    folderId: string;
    itemIds: string[];
    itemNames: string[];
    itemType: FolderResourceType;
    folderName: string;
    sourceFolderId: string;
    isInMainFolder: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
}) {
    const { showDuplicateItemWarning } = useDuplicateItemDialogStore.getState();
    showDuplicateItemWarning(warning);
}

// Hook to use the duplicate item warning dialog
export function useDuplicateItemWarning() {
    const { showDuplicateItemWarning, hideDuplicateItemWarning } = useDuplicateItemDialogStore();

    return {
        showDuplicateItemWarning,
        hideDuplicateItemWarning
    };
}
