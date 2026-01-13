import { create } from "zustand";
import type { FolderResourceType } from "@flowmaestro/shared";

export interface DuplicateItemWarning {
    folderId: string;
    itemIds: string[];
    itemNames: string[];
    itemType: FolderResourceType;
    folderName: string;
    sourceFolderId: string;
    isInMainFolder: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface DuplicateItemDialogStore {
    // Duplicate item warning dialog
    duplicateItemWarning: DuplicateItemWarning | null;
    showDuplicateItemWarning: (warning: DuplicateItemWarning) => void;
    hideDuplicateItemWarning: () => void;
}

export const useDuplicateItemDialogStore = create<DuplicateItemDialogStore>((set) => ({
    duplicateItemWarning: null,
    showDuplicateItemWarning: (warning) => set({ duplicateItemWarning: warning }),
    hideDuplicateItemWarning: () => set({ duplicateItemWarning: null })
}));
