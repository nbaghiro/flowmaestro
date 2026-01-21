/**
 * Dialog Component Tests
 *
 * Tests for the base Dialog component used for modals throughout the app.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Visibility bugs:
 *    - Dialog shown when isOpen is false
 *    - Dialog not shown when isOpen is true
 *
 * 2. Content bugs:
 *    - Title not rendered
 *    - Description not rendered
 *    - Children content not rendered
 *    - Custom header not rendered
 *    - Footer not rendered
 *
 * 3. Close behavior bugs:
 *    - onClose not called when clicking X button
 *    - onClose not called when pressing Escape
 *    - onClose not called when clicking backdrop
 *    - closeOnBackdropClick=false still closes on backdrop click
 *    - Close button shown when showCloseButton=false
 *
 * 4. Size bugs:
 *    - Wrong max-width for size variants
 *    - Default size not applied
 *
 * 5. Body scroll bugs:
 *    - Body still scrollable when dialog is open
 *    - Body scroll not restored when dialog closes
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Dialog } from "../Dialog";

describe("Dialog", () => {
    // Reset body overflow after each test
    afterEach(() => {
        document.body.style.overflow = "unset";
    });

    // ===== Visibility =====
    describe("visibility", () => {
        it("renders nothing when isOpen is false", () => {
            render(
                <Dialog isOpen={false} onClose={() => {}} title="Test">
                    Content
                </Dialog>
            );

            expect(screen.queryByText("Test")).not.toBeInTheDocument();
            expect(screen.queryByText("Content")).not.toBeInTheDocument();
        });

        it("renders dialog when isOpen is true", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Test">
                    Content
                </Dialog>
            );

            expect(screen.getByText("Test")).toBeInTheDocument();
            expect(screen.getByText("Content")).toBeInTheDocument();
        });
    });

    // ===== Content Rendering =====
    describe("content rendering", () => {
        it("renders title", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Dialog Title">
                    Content
                </Dialog>
            );

            expect(screen.getByText("Dialog Title")).toBeInTheDocument();
        });

        it("renders description", () => {
            render(
                <Dialog
                    isOpen={true}
                    onClose={() => {}}
                    title="Title"
                    description="Dialog description text"
                >
                    Content
                </Dialog>
            );

            expect(screen.getByText("Dialog description text")).toBeInTheDocument();
        });

        it("renders children content", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title">
                    <p>Child paragraph</p>
                    <button>Child button</button>
                </Dialog>
            );

            expect(screen.getByText("Child paragraph")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Child button" })).toBeInTheDocument();
        });

        it("renders custom header instead of title/description", () => {
            render(
                <Dialog
                    isOpen={true}
                    onClose={() => {}}
                    title="Should not render"
                    description="Should not render"
                    header={<div>Custom Header Content</div>}
                >
                    Content
                </Dialog>
            );

            expect(screen.getByText("Custom Header Content")).toBeInTheDocument();
            expect(screen.queryByText("Should not render")).not.toBeInTheDocument();
        });

        it("renders footer", () => {
            render(
                <Dialog
                    isOpen={true}
                    onClose={() => {}}
                    title="Title"
                    footer={
                        <div>
                            <button>Cancel</button>
                            <button>Confirm</button>
                        </div>
                    }
                >
                    Content
                </Dialog>
            );

            expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
        });

        it("does not render header section when no title or header", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}}>
                    Content only
                </Dialog>
            );

            expect(screen.getByText("Content only")).toBeInTheDocument();
            // No header elements should be present
            expect(screen.queryByRole("heading")).not.toBeInTheDocument();
        });
    });

    // ===== Close Button =====
    describe("close button", () => {
        it("shows close button by default when title is present", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title">
                    Content
                </Dialog>
            );

            // Close button should be present
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBeGreaterThan(0);
        });

        it("hides close button when showCloseButton is false", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" showCloseButton={false}>
                    <button>Only button</button>
                </Dialog>
            );

            // Only the child button should be present
            const buttons = screen.getAllByRole("button");
            expect(buttons).toHaveLength(1);
            expect(buttons[0]).toHaveTextContent("Only button");
        });

        it("calls onClose when close button is clicked", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={true} onClose={onClose} title="Title">
                    Content
                </Dialog>
            );

            // Find and click the close button (it's the button in the header)
            const closeButton = screen.getAllByRole("button")[0];
            await user.click(closeButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Escape Key =====
    describe("escape key", () => {
        it("calls onClose when Escape is pressed", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={true} onClose={onClose} title="Title">
                    Content
                </Dialog>
            );

            await user.keyboard("{Escape}");

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("does not call onClose when Escape is pressed and dialog is closed", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={false} onClose={onClose} title="Title">
                    Content
                </Dialog>
            );

            await user.keyboard("{Escape}");

            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ===== Backdrop Click =====
    describe("backdrop click", () => {
        it("calls onClose when backdrop is clicked by default", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={true} onClose={onClose} title="Title">
                    Content
                </Dialog>
            );

            // Click the backdrop (first div with bg-black)
            const backdrop = document.querySelector(".bg-black\\/60");
            expect(backdrop).toBeInTheDocument();

            await user.click(backdrop!);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("does not call onClose when closeOnBackdropClick is false", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={true} onClose={onClose} title="Title" closeOnBackdropClick={false}>
                    Content
                </Dialog>
            );

            const backdrop = document.querySelector(".bg-black\\/60");
            await user.click(backdrop!);

            expect(onClose).not.toHaveBeenCalled();
        });

        it("does not call onClose when clicking dialog content", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog isOpen={true} onClose={onClose} title="Title">
                    <div data-testid="content">Content</div>
                </Dialog>
            );

            await user.click(screen.getByTestId("content"));

            // Should only be called if close button was clicked, not content
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ===== Size =====
    describe("size", () => {
        it("applies medium size by default", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".max-w-md");
            expect(dialog).toBeInTheDocument();
        });

        it("applies small size", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" size="sm">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".max-w-sm");
            expect(dialog).toBeInTheDocument();
        });

        it("applies large size", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" size="lg">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".max-w-lg");
            expect(dialog).toBeInTheDocument();
        });

        it("applies xl size", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" size="xl">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".max-w-xl");
            expect(dialog).toBeInTheDocument();
        });

        it("applies full size", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" size="full">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".max-w-\\[95vw\\]");
            expect(dialog).toBeInTheDocument();
        });
    });

    // ===== Body Scroll =====
    describe("body scroll", () => {
        it("prevents body scroll when open", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title">
                    Content
                </Dialog>
            );

            expect(document.body.style.overflow).toBe("hidden");
        });

        it("restores body scroll when closed", () => {
            const { rerender } = render(
                <Dialog isOpen={true} onClose={() => {}} title="Title">
                    Content
                </Dialog>
            );

            expect(document.body.style.overflow).toBe("hidden");

            rerender(
                <Dialog isOpen={false} onClose={() => {}} title="Title">
                    Content
                </Dialog>
            );

            expect(document.body.style.overflow).toBe("unset");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("applies custom className to dialog container", () => {
            render(
                <Dialog isOpen={true} onClose={() => {}} title="Title" className="custom-dialog">
                    Content
                </Dialog>
            );

            const dialog = document.querySelector(".custom-dialog");
            expect(dialog).toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders confirmation dialog pattern", async () => {
            const onConfirm = vi.fn();
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <Dialog
                    isOpen={true}
                    onClose={onClose}
                    title="Delete Item"
                    description="Are you sure you want to delete this item?"
                    footer={
                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose}>Cancel</button>
                            <button onClick={onConfirm}>Delete</button>
                        </div>
                    }
                >
                    <p>This action cannot be undone.</p>
                </Dialog>
            );

            expect(screen.getByText("Delete Item")).toBeInTheDocument();
            expect(
                screen.getByText("Are you sure you want to delete this item?")
            ).toBeInTheDocument();

            await user.click(screen.getByRole("button", { name: "Delete" }));
            expect(onConfirm).toHaveBeenCalled();

            await user.click(screen.getByRole("button", { name: "Cancel" }));
            expect(onClose).toHaveBeenCalled();
        });

        it("renders form dialog pattern", () => {
            render(
                <Dialog
                    isOpen={true}
                    onClose={() => {}}
                    title="Edit Profile"
                    size="lg"
                    footer={
                        <div className="flex gap-2 justify-end">
                            <button>Cancel</button>
                            <button type="submit">Save</button>
                        </div>
                    }
                >
                    <form>
                        <label>
                            Name
                            <input type="text" />
                        </label>
                    </form>
                </Dialog>
            );

            expect(screen.getByText("Edit Profile")).toBeInTheDocument();
            expect(screen.getByLabelText("Name")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
        });
    });
});
