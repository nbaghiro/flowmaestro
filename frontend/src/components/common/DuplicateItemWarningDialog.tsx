import { useDuplicateItemDialogStore } from "../../stores/duplicateItemDialogStore";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Duplicate Item Warning Dialog Component
 *
 * Renders the duplicate item warning dialog when moving items to folders.
 */
export function DuplicateItemWarningDialog() {
    const { duplicateItemWarning, hideDuplicateItemWarning } = useDuplicateItemDialogStore();

    if (!duplicateItemWarning) {
        return null;
    }

    const { itemNames, folderName, isInMainFolder, onConfirm, onCancel } = duplicateItemWarning;

    const handleClose = () => {
        if (onCancel) {
            onCancel();
        }
        hideDuplicateItemWarning();
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        hideDuplicateItemWarning();
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
    const itemTypeLabel = getItemTypeLabel(duplicateItemWarning.itemType, !isSingle);

    return (
        <ConfirmDialog
            isOpen={true}
            onClose={handleClose}
            onConfirm={isInMainFolder ? undefined : handleConfirm}
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
                                will move the{" "}
                                {getItemTypeLabel(duplicateItemWarning.itemType, false)} from the
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
            confirmText={isInMainFolder ? undefined : "Move file"}
            cancelText={isInMainFolder ? "Close" : "Cancel"}
            variant="default"
        />
    );
}
