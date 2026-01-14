import type { FolderResourceType } from "@flowmaestro/shared";
import { ConfirmDialog } from "../common/ConfirmDialog";

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

interface DuplicateItemWarningDialogProps {
    warning: DuplicateItemWarning | null;
    onClose: () => void;
}

/**
 * Duplicate Item Warning Dialog Component
 *
 * Renders the duplicate item warning dialog when moving items to folders.
 */
export function DuplicateItemWarningDialog({ warning, onClose }: DuplicateItemWarningDialogProps) {
    if (!warning) {
        return null;
    }

    const { itemNames, folderName, isInMainFolder, onConfirm, onCancel } = warning;

    const handleClose = () => {
        if (onCancel) {
            onCancel();
        }
        onClose();
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    // Format item names for display
    const formatItemNames = () => {
        if (itemNames.length === 1) {
            return `"${itemNames[0]}"`;
        }
        return itemNames.map((name, idx) => (
            <span key={idx}>
                "{name}"
                {idx < itemNames.length - 1 ? (idx === itemNames.length - 2 ? " and " : ", ") : ""}
            </span>
        ));
    };

    // Get item type label
    const getItemTypeLabel = (itemType: string, plural: boolean) => {
        switch (itemType) {
            case "workflow":
                return plural ? "workflows" : "workflow";
            case "agent":
                return plural ? "agents" : "agent";
            case "form-interface":
                return plural ? "form interfaces" : "form interface";
            case "chat-interface":
                return plural ? "chat interfaces" : "chat interface";
            case "knowledge-base":
                return plural ? "knowledge bases" : "knowledge base";
            default:
                return plural ? "items" : "item";
        }
    };

    const isSingle = itemNames.length === 1;
    const itemTypeLabel = getItemTypeLabel(warning.itemType, !isSingle);

    return (
        <ConfirmDialog
            isOpen={true}
            onClose={handleClose}
            onConfirm={isInMainFolder ? handleClose : handleConfirm}
            title={isInMainFolder ? "Item already in folder" : "Item already in subfolder"}
            message={
                isInMainFolder ? (
                    <>
                        {isSingle ? (
                            <>
                                {formatItemNames()} is already in the folder{" "}
                                <strong>{folderName}</strong>.
                            </>
                        ) : (
                            <>
                                The following {itemTypeLabel} are already in the folder{" "}
                                <strong>{folderName}</strong>: {formatItemNames()}.
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {isSingle ? (
                            <>
                                {formatItemNames()} is already in a subfolder of{" "}
                                <strong>{folderName}</strong>. Do you want to move it anyway? This
                                will move the {getItemTypeLabel(warning.itemType, false)} from the
                                subfolder to the selected folder.
                            </>
                        ) : (
                            <>
                                The following {itemTypeLabel} are already in a subfolder of{" "}
                                <strong>{folderName}</strong>: {formatItemNames()}. Do you want to
                                move them anyway? This will move the {itemTypeLabel} from the
                                subfolder to the selected folder.
                            </>
                        )}
                    </>
                )
            }
            confirmText={isInMainFolder ? "Close" : "Move file"}
            cancelText="Cancel"
            variant="default"
        />
    );
}
