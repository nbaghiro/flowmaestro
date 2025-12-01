import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
    onSave: () => void;
    onRun?: () => void;
    onOpenSettings: () => void;
    onOpenCheckpoints?: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onFitView: () => void;
    canUndo?: () => boolean;
    canRedo?: () => boolean;
    onCreateComment?: () => void;
}

/**
 * Custom hook to manage keyboard shortcuts for the FlowBuilder
 *
 * @param handlers Object containing all keyboard shortcut handlers
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
    const {
        onSave,
        onRun,
        onOpenSettings,
        onOpenCheckpoints,
        onUndo,
        onRedo,
        onDelete,
        onDuplicate,
        onCopy,
        onPaste,
        onSelectAll,
        onDeselectAll,
        onFitView,
        onCreateComment,
        canUndo = () => true,
        canRedo = () => true
    } = handlers;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            const key = event.key.toLowerCase();
            const modifier = event.metaKey || event.ctrlKey;

            // Escape - Deselect / exit edit mode (even while typing)
            if (event.key === "Escape") {
                event.preventDefault();
                if (target && typeof (target as HTMLElement).blur === "function") {
                    (target as HTMLElement).blur();
                }
                onDeselectAll();
                return;
            }

            // Cmd+S / Ctrl+S - Save (works even when typing)
            if (modifier && key === "s") {
                event.preventDefault();
                onSave();
                return;
            }

            // Ignore other shortcuts when typing in input fields
            if (isTyping) return;

            // Cmd+Enter / Ctrl+Enter - Run workflow
            if (modifier && event.key === "Enter" && onRun) {
                event.preventDefault();
                onRun();
                return;
            }

            // Cmd+, / Ctrl+, - Open settings
            if (modifier && event.key === ",") {
                event.preventDefault();
                onOpenSettings();
                return;
            }

            // Cmd+. / Ctrl+. - Open checkpoints
            if (modifier && event.key === "." && onOpenCheckpoints) {
                event.preventDefault();
                onOpenCheckpoints();
                return;
            }

            // Cmd+Z / Ctrl+Z - Undo
            if (modifier && key === "z" && !event.shiftKey) {
                event.preventDefault();
                if (canUndo()) onUndo();
                return;
            }

            // Cmd+Shift+Z / Ctrl+Shift+Z - Redo
            if (modifier && event.shiftKey && key === "z") {
                event.preventDefault();
                if (canRedo()) onRedo();
                return;
            }

            // Ctrl+Y / Cmd+Y - Redo (Windows/Linux alternative)
            if (modifier && key === "y") {
                event.preventDefault();
                if (canRedo()) onRedo();
                return;
            }

            // Delete / Backspace - Delete node
            if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                onDelete();
                return;
            }

            // Cmd+D / Ctrl+D - Duplicate node
            if (modifier && key === "d") {
                event.preventDefault();
                onDuplicate();
                return;
            }

            // Cmd+C / Ctrl+C - Copy node
            if (modifier && key === "c") {
                event.preventDefault();
                onCopy();
                return;
            }

            // Cmd+V / Ctrl+V - Paste node
            if (modifier && key === "v") {
                event.preventDefault();
                onPaste();
                return;
            }

            // Cmd+A / Ctrl+A - Select all nodes
            if (modifier && key === "a") {
                event.preventDefault();
                onSelectAll();
                return;
            }

            // Cmd+0 / Ctrl+0 - Fit view
            if (modifier && key === "0") {
                event.preventDefault();
                onFitView();
                return;
            }

            // "N" - Create Comment Node
            if (!modifier && key === "n" && onCreateComment) {
                event.preventDefault();
                onCreateComment();
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        onSave,
        onRun,
        onOpenSettings,
        onOpenCheckpoints,
        onUndo,
        onRedo,
        onDelete,
        onDuplicate,
        onCopy,
        onPaste,
        onSelectAll,
        onDeselectAll,
        onFitView,
        canUndo,
        canRedo,
        onCreateComment
    ]);
}
