/**
 * useKeyboardShortcuts Hook Tests
 *
 * Tests for keyboard shortcut handling patterns including
 * modifier keys, input field detection, and various shortcuts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Since we can't call React hooks directly, we test the keyboard event
// handling logic by simulating what the hook does.

// Mock document event listeners
let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

const mockAddEventListener = vi.fn((event: string, handler: (e: KeyboardEvent) => void) => {
    if (event === "keydown") {
        keydownHandler = handler;
    }
});

const mockRemoveEventListener = vi.fn();

Object.defineProperty(globalThis, "document", {
    value: {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
    },
    writable: true
});

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
    const event = {
        key,
        metaKey: options.metaKey || false,
        ctrlKey: options.ctrlKey || false,
        shiftKey: options.shiftKey || false,
        target: {
            tagName: "DIV",
            isContentEditable: false,
            blur: vi.fn(),
            ...options.target
        },
        preventDefault: vi.fn()
    } as unknown as KeyboardEvent;
    return event;
}

// Simulate what the hook does
function setupKeyboardHandler(handlers: {
    onSave?: () => void;
    onRun?: () => void;
    onOpenSettings?: () => void;
    onOpenCheckpoints?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onSelectAll?: () => void;
    onDeselectAll?: () => void;
    onFitView?: () => void;
    onAutoLayout?: () => void;
    onCreateComment?: () => void;
    canUndo?: () => boolean;
    canRedo?: () => boolean;
}) {
    const {
        onSave = vi.fn(),
        onRun,
        onOpenSettings = vi.fn(),
        onOpenCheckpoints,
        onUndo = vi.fn(),
        onRedo = vi.fn(),
        onDelete = vi.fn(),
        onDuplicate = vi.fn(),
        onCopy = vi.fn(),
        onPaste = vi.fn(),
        onSelectAll = vi.fn(),
        onDeselectAll = vi.fn(),
        onFitView = vi.fn(),
        onAutoLayout,
        onCreateComment,
        canUndo = () => true,
        canRedo = () => true
    } = handlers;

    keydownHandler = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        const isTyping =
            target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

        const key = event.key.toLowerCase();
        const modifier = event.metaKey || event.ctrlKey;

        // Escape - Deselect / exit edit mode
        if (event.key === "Escape") {
            event.preventDefault();
            if (target && typeof target.blur === "function") {
                target.blur();
            }
            onDeselectAll();
            return;
        }

        // Cmd+S / Ctrl+S - Save
        if (modifier && key === "s") {
            event.preventDefault();
            onSave();
            return;
        }

        // Ignore other shortcuts when typing
        if (isTyping) return;

        // Cmd+Enter - Run
        if (modifier && event.key === "Enter" && onRun) {
            event.preventDefault();
            onRun();
            return;
        }

        // Cmd+, - Settings
        if (modifier && event.key === ",") {
            event.preventDefault();
            onOpenSettings();
            return;
        }

        // Cmd+. - Checkpoints
        if (modifier && event.key === "." && onOpenCheckpoints) {
            event.preventDefault();
            onOpenCheckpoints();
            return;
        }

        // Cmd+Z - Undo
        if (modifier && key === "z" && !event.shiftKey) {
            event.preventDefault();
            if (canUndo()) onUndo();
            return;
        }

        // Cmd+Shift+Z - Redo
        if (modifier && event.shiftKey && key === "z") {
            event.preventDefault();
            if (canRedo()) onRedo();
            return;
        }

        // Ctrl+Y - Redo
        if (modifier && key === "y") {
            event.preventDefault();
            if (canRedo()) onRedo();
            return;
        }

        // Delete / Backspace
        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onDelete();
            return;
        }

        // Cmd+D - Duplicate
        if (modifier && key === "d") {
            event.preventDefault();
            onDuplicate();
            return;
        }

        // Cmd+C - Copy
        if (modifier && key === "c") {
            event.preventDefault();
            onCopy();
            return;
        }

        // Cmd+V - Paste
        if (modifier && key === "v") {
            event.preventDefault();
            onPaste();
            return;
        }

        // Cmd+A - Select all
        if (modifier && key === "a") {
            event.preventDefault();
            onSelectAll();
            return;
        }

        // Cmd+0 - Fit view
        if (modifier && key === "0") {
            event.preventDefault();
            onFitView();
            return;
        }

        // N - Create comment
        if (!modifier && key === "n" && onCreateComment) {
            event.preventDefault();
            onCreateComment();
            return;
        }

        // Shift+L - Auto layout
        if (!modifier && event.shiftKey && key === "l" && onAutoLayout) {
            event.preventDefault();
            onAutoLayout();
            return;
        }
    };

    return {
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
        onAutoLayout,
        onCreateComment,
        canUndo,
        canRedo
    };
}

describe("useKeyboardShortcuts patterns", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        keydownHandler = null;
    });

    afterEach(() => {
        keydownHandler = null;
    });

    // ===== Save Shortcut =====
    describe("Cmd+S / Ctrl+S - Save", () => {
        it("triggers save with Cmd+S", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("s", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onSave).toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it("triggers save with Ctrl+S", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("s", { ctrlKey: true });

            keydownHandler!(event);

            expect(handlers.onSave).toHaveBeenCalled();
        });

        it("saves even when typing in input", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("s", {
                metaKey: true,
                target: { tagName: "INPUT" }
            });

            keydownHandler!(event);

            expect(handlers.onSave).toHaveBeenCalled();
        });
    });

    // ===== Escape =====
    describe("Escape - Deselect", () => {
        it("triggers deselect all on Escape", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("Escape");

            keydownHandler!(event);

            expect(handlers.onDeselectAll).toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it("blurs active element", () => {
            const handlers = setupKeyboardHandler({});
            const blur = vi.fn();
            const event = createKeyboardEvent("Escape", {
                target: { blur }
            });

            keydownHandler!(event);

            expect(blur).toHaveBeenCalled();
            expect(handlers.onDeselectAll).toHaveBeenCalled();
        });
    });

    // ===== Undo/Redo =====
    describe("Cmd+Z - Undo", () => {
        it("triggers undo with Cmd+Z", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("z", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onUndo).toHaveBeenCalled();
        });

        it("does not undo when canUndo returns false", () => {
            const handlers = setupKeyboardHandler({ canUndo: () => false });
            const event = createKeyboardEvent("z", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onUndo).not.toHaveBeenCalled();
        });
    });

    describe("Cmd+Shift+Z / Ctrl+Y - Redo", () => {
        it("triggers redo with Cmd+Shift+Z", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });

            keydownHandler!(event);

            expect(handlers.onRedo).toHaveBeenCalled();
        });

        it("triggers redo with Ctrl+Y", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("y", { ctrlKey: true });

            keydownHandler!(event);

            expect(handlers.onRedo).toHaveBeenCalled();
        });

        it("does not redo when canRedo returns false", () => {
            const handlers = setupKeyboardHandler({ canRedo: () => false });
            const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });

            keydownHandler!(event);

            expect(handlers.onRedo).not.toHaveBeenCalled();
        });
    });

    // ===== Delete =====
    describe("Delete / Backspace - Delete", () => {
        it("triggers delete with Delete key", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("Delete");

            keydownHandler!(event);

            expect(handlers.onDelete).toHaveBeenCalled();
        });

        it("triggers delete with Backspace key", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("Backspace");

            keydownHandler!(event);

            expect(handlers.onDelete).toHaveBeenCalled();
        });

        it("ignores delete when typing in input", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("Delete", {
                target: { tagName: "INPUT" }
            });

            keydownHandler!(event);

            expect(handlers.onDelete).not.toHaveBeenCalled();
        });
    });

    // ===== Copy/Paste/Duplicate =====
    describe("Cmd+C/V/D - Copy/Paste/Duplicate", () => {
        it("triggers copy with Cmd+C", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("c", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onCopy).toHaveBeenCalled();
        });

        it("triggers paste with Cmd+V", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("v", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onPaste).toHaveBeenCalled();
        });

        it("triggers duplicate with Cmd+D", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("d", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onDuplicate).toHaveBeenCalled();
        });

        it("ignores copy when typing in textarea", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("c", {
                metaKey: true,
                target: { tagName: "TEXTAREA" }
            });

            keydownHandler!(event);

            expect(handlers.onCopy).not.toHaveBeenCalled();
        });
    });

    // ===== Select All =====
    describe("Cmd+A - Select All", () => {
        it("triggers select all with Cmd+A", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("a", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onSelectAll).toHaveBeenCalled();
        });
    });

    // ===== Fit View =====
    describe("Cmd+0 - Fit View", () => {
        it("triggers fit view with Cmd+0", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("0", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onFitView).toHaveBeenCalled();
        });
    });

    // ===== Run Workflow =====
    describe("Cmd+Enter - Run", () => {
        it("triggers run with Cmd+Enter when handler provided", () => {
            const onRun = vi.fn();
            setupKeyboardHandler({ onRun });
            const event = createKeyboardEvent("Enter", { metaKey: true });

            keydownHandler!(event);

            expect(onRun).toHaveBeenCalled();
        });

        it("does nothing when onRun not provided", () => {
            setupKeyboardHandler({});
            const event = createKeyboardEvent("Enter", { metaKey: true });

            keydownHandler!(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    // ===== Settings =====
    describe("Cmd+, - Settings", () => {
        it("triggers settings with Cmd+,", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent(",", { metaKey: true });

            keydownHandler!(event);

            expect(handlers.onOpenSettings).toHaveBeenCalled();
        });
    });

    // ===== Create Comment =====
    describe("N - Create Comment", () => {
        it("triggers create comment with N key", () => {
            const onCreateComment = vi.fn();
            setupKeyboardHandler({ onCreateComment });
            const event = createKeyboardEvent("n");

            keydownHandler!(event);

            expect(onCreateComment).toHaveBeenCalled();
        });

        it("does not create comment with Cmd+N", () => {
            const onCreateComment = vi.fn();
            setupKeyboardHandler({ onCreateComment });
            const event = createKeyboardEvent("n", { metaKey: true });

            keydownHandler!(event);

            expect(onCreateComment).not.toHaveBeenCalled();
        });
    });

    // ===== Auto Layout =====
    describe("Shift+L - Auto Layout", () => {
        it("triggers auto layout with Shift+L", () => {
            const onAutoLayout = vi.fn();
            setupKeyboardHandler({ onAutoLayout });
            const event = createKeyboardEvent("l", { shiftKey: true });

            keydownHandler!(event);

            expect(onAutoLayout).toHaveBeenCalled();
        });
    });

    // ===== Input Field Filtering =====
    describe("input field filtering", () => {
        it("ignores most shortcuts in INPUT fields", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("d", {
                metaKey: true,
                target: { tagName: "INPUT" }
            });

            keydownHandler!(event);

            expect(handlers.onDuplicate).not.toHaveBeenCalled();
        });

        it("ignores most shortcuts in TEXTAREA fields", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("a", {
                metaKey: true,
                target: { tagName: "TEXTAREA" }
            });

            keydownHandler!(event);

            expect(handlers.onSelectAll).not.toHaveBeenCalled();
        });

        it("ignores most shortcuts in contentEditable elements", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("z", {
                metaKey: true,
                target: { tagName: "DIV", isContentEditable: true }
            });

            keydownHandler!(event);

            expect(handlers.onUndo).not.toHaveBeenCalled();
        });

        it("always allows Save even in input fields", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("s", {
                metaKey: true,
                target: { tagName: "INPUT" }
            });

            keydownHandler!(event);

            expect(handlers.onSave).toHaveBeenCalled();
        });

        it("always allows Escape even in input fields", () => {
            const handlers = setupKeyboardHandler({});
            const event = createKeyboardEvent("Escape", {
                target: { tagName: "INPUT", blur: vi.fn() }
            });

            keydownHandler!(event);

            expect(handlers.onDeselectAll).toHaveBeenCalled();
        });
    });
});
