/**
 * useKeyboardShortcuts Hook Tests
 *
 * Tests for keyboard shortcut handling using renderHook.
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useKeyboardShortcuts, KeyboardShortcutHandlers } from "../useKeyboardShortcuts";

// Helper to create keyboard events
function createKeyboardEvent(
    key: string,
    options: {
        metaKey?: boolean;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        target?: Partial<HTMLElement>;
    } = {}
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        metaKey: options.metaKey || false,
        ctrlKey: options.ctrlKey || false,
        shiftKey: options.shiftKey || false,
        bubbles: true
    });

    // Override target since KeyboardEvent constructor doesn't support it
    Object.defineProperty(event, "target", {
        value: {
            tagName: "DIV",
            isContentEditable: false,
            blur: vi.fn(),
            ...options.target
        },
        writable: false
    });

    return event;
}

// Helper to dispatch keyboard event
function pressKey(
    key: string,
    options: {
        metaKey?: boolean;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        target?: Partial<HTMLElement>;
    } = {}
) {
    const event = createKeyboardEvent(key, options);
    document.dispatchEvent(event);
    return event;
}

describe("useKeyboardShortcuts", () => {
    let handlers: KeyboardShortcutHandlers;

    beforeEach(() => {
        handlers = {
            onSave: vi.fn(),
            onRun: vi.fn(),
            onOpenSettings: vi.fn(),
            onOpenCheckpoints: vi.fn(),
            onUndo: vi.fn(),
            onRedo: vi.fn(),
            onDelete: vi.fn(),
            onDuplicate: vi.fn(),
            onCopy: vi.fn(),
            onPaste: vi.fn(),
            onSelectAll: vi.fn(),
            onDeselectAll: vi.fn(),
            onFitView: vi.fn(),
            onAutoLayout: vi.fn(),
            onCreateComment: vi.fn(),
            canUndo: vi.fn(() => true),
            canRedo: vi.fn(() => true)
        };
    });

    // ===== Save Shortcut =====
    describe("save shortcut (Cmd/Ctrl+S)", () => {
        it("triggers onSave with Cmd+S", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("s", { metaKey: true });

            expect(handlers.onSave).toHaveBeenCalledTimes(1);
        });

        it("triggers onSave with Ctrl+S", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("s", { ctrlKey: true });

            expect(handlers.onSave).toHaveBeenCalledTimes(1);
        });

        it("works even when typing in input", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("s", { metaKey: true, target: { tagName: "INPUT" } });

            expect(handlers.onSave).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Run Shortcut =====
    describe("run shortcut (Cmd/Ctrl+Enter)", () => {
        it("triggers onRun with Cmd+Enter", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Enter", { metaKey: true });

            expect(handlers.onRun).toHaveBeenCalledTimes(1);
        });

        it("does not trigger when typing in input", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Enter", { metaKey: true, target: { tagName: "INPUT" } });

            expect(handlers.onRun).not.toHaveBeenCalled();
        });
    });

    // ===== Settings Shortcut =====
    describe("settings shortcut (Cmd/Ctrl+,)", () => {
        it("triggers onOpenSettings with Cmd+,", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey(",", { metaKey: true });

            expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Checkpoints Shortcut =====
    describe("checkpoints shortcut (Cmd/Ctrl+.)", () => {
        it("triggers onOpenCheckpoints with Cmd+.", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey(".", { metaKey: true });

            expect(handlers.onOpenCheckpoints).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Undo/Redo Shortcuts =====
    describe("undo shortcut (Cmd/Ctrl+Z)", () => {
        it("triggers onUndo with Cmd+Z", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("z", { metaKey: true });

            expect(handlers.onUndo).toHaveBeenCalledTimes(1);
        });

        it("checks canUndo before calling onUndo", () => {
            handlers.canUndo = vi.fn(() => false);
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("z", { metaKey: true });

            expect(handlers.canUndo).toHaveBeenCalled();
            expect(handlers.onUndo).not.toHaveBeenCalled();
        });
    });

    describe("redo shortcut (Cmd/Ctrl+Shift+Z)", () => {
        it("triggers onRedo with Cmd+Shift+Z", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("z", { metaKey: true, shiftKey: true });

            expect(handlers.onRedo).toHaveBeenCalledTimes(1);
        });

        it("triggers onRedo with Ctrl+Y", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("y", { ctrlKey: true });

            expect(handlers.onRedo).toHaveBeenCalledTimes(1);
        });

        it("checks canRedo before calling onRedo", () => {
            handlers.canRedo = vi.fn(() => false);
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("z", { metaKey: true, shiftKey: true });

            expect(handlers.canRedo).toHaveBeenCalled();
            expect(handlers.onRedo).not.toHaveBeenCalled();
        });
    });

    // ===== Delete Shortcut =====
    describe("delete shortcut (Delete/Backspace)", () => {
        it("triggers onDelete with Delete key", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Delete");

            expect(handlers.onDelete).toHaveBeenCalledTimes(1);
        });

        it("triggers onDelete with Backspace key", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Backspace");

            expect(handlers.onDelete).toHaveBeenCalledTimes(1);
        });

        it("does not trigger when typing in input", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Delete", { target: { tagName: "INPUT" } });

            expect(handlers.onDelete).not.toHaveBeenCalled();
        });
    });

    // ===== Duplicate Shortcut =====
    describe("duplicate shortcut (Cmd/Ctrl+D)", () => {
        it("triggers onDuplicate with Cmd+D", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("d", { metaKey: true });

            expect(handlers.onDuplicate).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Copy/Paste Shortcuts =====
    describe("copy shortcut (Cmd/Ctrl+C)", () => {
        it("triggers onCopy with Cmd+C", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("c", { metaKey: true });

            expect(handlers.onCopy).toHaveBeenCalledTimes(1);
        });
    });

    describe("paste shortcut (Cmd/Ctrl+V)", () => {
        it("triggers onPaste with Cmd+V", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("v", { metaKey: true });

            expect(handlers.onPaste).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Select All Shortcut =====
    describe("select all shortcut (Cmd/Ctrl+A)", () => {
        it("triggers onSelectAll with Cmd+A", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("a", { metaKey: true });

            expect(handlers.onSelectAll).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Escape Shortcut =====
    describe("escape shortcut", () => {
        it("triggers onDeselectAll with Escape", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Escape");

            expect(handlers.onDeselectAll).toHaveBeenCalledTimes(1);
        });

        it("works even when typing in input", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("Escape", { target: { tagName: "INPUT" } });

            expect(handlers.onDeselectAll).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Fit View Shortcut =====
    describe("fit view shortcut (Cmd/Ctrl+0)", () => {
        it("triggers onFitView with Cmd+0", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("0", { metaKey: true });

            expect(handlers.onFitView).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Auto Layout Shortcut =====
    describe("auto layout shortcut (Shift+L)", () => {
        it("triggers onAutoLayout with Shift+L", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("l", { shiftKey: true });

            expect(handlers.onAutoLayout).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Create Comment Shortcut =====
    describe("create comment shortcut (N)", () => {
        it("triggers onCreateComment with N key", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("n");

            expect(handlers.onCreateComment).toHaveBeenCalledTimes(1);
        });

        it("does not trigger when modifier key is held", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("n", { metaKey: true });

            expect(handlers.onCreateComment).not.toHaveBeenCalled();
        });
    });

    // ===== Cleanup =====
    describe("cleanup", () => {
        it("removes event listener on unmount", () => {
            const addSpy = vi.spyOn(document, "addEventListener");
            const removeSpy = vi.spyOn(document, "removeEventListener");

            const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

            expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

            unmount();

            expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

            addSpy.mockRestore();
            removeSpy.mockRestore();
        });
    });

    // ===== Optional Handlers =====
    describe("optional handlers", () => {
        it("handles missing onRun gracefully", () => {
            const { onRun: _onRun, ...handlersWithoutRun } = handlers;
            renderHook(() => useKeyboardShortcuts(handlersWithoutRun as KeyboardShortcutHandlers));

            // Should not throw
            expect(() => pressKey("Enter", { metaKey: true })).not.toThrow();
        });

        it("handles missing onAutoLayout gracefully", () => {
            const { onAutoLayout: _onAutoLayout, ...handlersWithoutLayout } = handlers;
            renderHook(() =>
                useKeyboardShortcuts(handlersWithoutLayout as KeyboardShortcutHandlers)
            );

            // Should not throw
            expect(() => pressKey("l", { shiftKey: true })).not.toThrow();
        });
    });

    // ===== Input Field Detection =====
    describe("input field detection", () => {
        it("ignores most shortcuts when in textarea", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("d", { metaKey: true, target: { tagName: "TEXTAREA" } });

            expect(handlers.onDuplicate).not.toHaveBeenCalled();
        });

        it("ignores most shortcuts when in contenteditable", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("d", { metaKey: true, target: { tagName: "DIV", isContentEditable: true } });

            expect(handlers.onDuplicate).not.toHaveBeenCalled();
        });

        it("still allows save when in input", () => {
            renderHook(() => useKeyboardShortcuts(handlers));

            pressKey("s", { metaKey: true, target: { tagName: "INPUT" } });

            expect(handlers.onSave).toHaveBeenCalledTimes(1);
        });
    });
});
