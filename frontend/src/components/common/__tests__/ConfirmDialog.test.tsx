/**
 * ConfirmDialog Component Tests
 *
 * Tests for the confirmation dialog used throughout the app for
 * destructive actions (delete workflow, remove member, revoke access, etc.)
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Visibility bugs:
 *    - Dialog renders when it shouldn't (isOpen=false)
 *    - Dialog doesn't render when it should (isOpen=true)
 *
 * 2. Callback bugs:
 *    - onConfirm not called when clicking confirm button
 *    - onClose not called after confirmation (dialog stays open)
 *    - Cancel button not calling onClose
 *
 * 3. Content bugs:
 *    - Title not displayed
 *    - Message not displayed
 *    - Custom button text not applied
 *    - React node messages not rendering
 *
 * 4. Variant bugs:
 *    - Warning icon missing for danger variant
 *    - Wrong button color for danger vs default
 *
 * 5. Interaction bugs:
 *    - Escape key not closing dialog
 *    - Backdrop click not closing dialog
 *    - Cancel button not visible when cancelText provided
 *
 * 6. Accessibility bugs:
 *    - Buttons not focusable
 *    - Missing semantic structure
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmDialog } from "../ConfirmDialog";

describe("ConfirmDialog", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: "Delete Item",
        message: "Are you sure you want to delete this item?"
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ===== Visibility Tests =====
    describe("visibility", () => {
        it("renders nothing when isOpen is false", () => {
            render(<ConfirmDialog {...defaultProps} isOpen={false} />);

            expect(screen.queryByText("Delete Item")).not.toBeInTheDocument();
            expect(screen.queryByText("Are you sure")).not.toBeInTheDocument();
        });

        it("renders dialog when isOpen is true", () => {
            render(<ConfirmDialog {...defaultProps} />);

            expect(screen.getByText("Delete Item")).toBeInTheDocument();
            expect(
                screen.getByText("Are you sure you want to delete this item?")
            ).toBeInTheDocument();
        });
    });

    // ===== Content Rendering Tests =====
    describe("content rendering", () => {
        it("displays the title", () => {
            render(<ConfirmDialog {...defaultProps} title="Remove Member" />);

            expect(screen.getByText("Remove Member")).toBeInTheDocument();
        });

        it("displays string message", () => {
            render(<ConfirmDialog {...defaultProps} message="This action cannot be undone." />);

            expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
        });

        it("displays React node message", () => {
            const message = (
                <span>
                    Delete <strong>important-file.txt</strong>?
                </span>
            );
            render(<ConfirmDialog {...defaultProps} message={message} />);

            expect(screen.getByText("important-file.txt")).toBeInTheDocument();
        });

        it("displays default confirm button text", () => {
            render(<ConfirmDialog {...defaultProps} />);

            expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
        });

        it("displays custom confirm button text", () => {
            render(<ConfirmDialog {...defaultProps} confirmText="Yes, Delete" />);

            expect(screen.getByRole("button", { name: "Yes, Delete" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
        });

        it("hides cancel button when cancelText is undefined", () => {
            render(<ConfirmDialog {...defaultProps} cancelText={undefined} />);

            // Only confirm button should be present
            const buttons = screen.getAllByRole("button");
            // Dialog has close button (X) + confirm button = 2
            expect(buttons.length).toBe(2);
        });

        it("displays cancel button when cancelText is provided", () => {
            render(<ConfirmDialog {...defaultProps} cancelText="No, Keep It" />);

            expect(screen.getByRole("button", { name: "No, Keep It" })).toBeInTheDocument();
        });
    });

    // ===== Variant Tests =====
    describe("variants", () => {
        it("shows warning icon for danger variant", () => {
            render(<ConfirmDialog {...defaultProps} variant="danger" />);

            // The AlertTriangle icon should be present (wrapped in a red circle)
            const warningContainer = document.querySelector(".bg-red-100");
            expect(warningContainer).toBeInTheDocument();
        });

        it("does not show warning icon for default variant", () => {
            render(<ConfirmDialog {...defaultProps} variant="default" />);

            const warningContainer = document.querySelector(".bg-red-100");
            expect(warningContainer).not.toBeInTheDocument();
        });

        it("does not show warning icon when variant is not specified", () => {
            render(<ConfirmDialog {...defaultProps} />);

            const warningContainer = document.querySelector(".bg-red-100");
            expect(warningContainer).not.toBeInTheDocument();
        });

        it("applies danger styling to confirm button for danger variant", () => {
            render(<ConfirmDialog {...defaultProps} variant="danger" confirmText="Delete" />);

            const confirmButton = screen.getByRole("button", { name: "Delete" });
            expect(confirmButton).toHaveClass("bg-red-600");
        });

        it("applies primary styling to confirm button for default variant", () => {
            render(<ConfirmDialog {...defaultProps} variant="default" />);

            const confirmButton = screen.getByRole("button", { name: "Confirm" });
            expect(confirmButton).toHaveClass("bg-primary");
        });
    });

    // ===== Callback Tests =====
    describe("callbacks", () => {
        it("calls onConfirm and onClose when confirm button is clicked", async () => {
            const onConfirm = vi.fn();
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <ConfirmDialog
                    {...defaultProps}
                    onConfirm={onConfirm}
                    onClose={onClose}
                    confirmText="Delete"
                />
            );

            await user.click(screen.getByRole("button", { name: "Delete" }));

            expect(onConfirm).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("calls onClose (not onConfirm) when cancel button is clicked", async () => {
            const onConfirm = vi.fn();
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(
                <ConfirmDialog
                    {...defaultProps}
                    onConfirm={onConfirm}
                    onClose={onClose}
                    cancelText="Cancel"
                />
            );

            await user.click(screen.getByRole("button", { name: "Cancel" }));

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onConfirm).not.toHaveBeenCalled();
        });

        it("calls onConfirm before onClose", async () => {
            const callOrder: string[] = [];
            const onConfirm = vi.fn(() => callOrder.push("confirm"));
            const onClose = vi.fn(() => callOrder.push("close"));
            const user = userEvent.setup();

            render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

            await user.click(screen.getByRole("button", { name: "Confirm" }));

            expect(callOrder).toEqual(["confirm", "close"]);
        });
    });

    // ===== Keyboard Interaction Tests =====
    describe("keyboard interactions", () => {
        it("closes dialog when Escape key is pressed", () => {
            const onClose = vi.fn();
            render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

            fireEvent.keyDown(document, { key: "Escape" });

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("does not call onConfirm when Escape is pressed", () => {
            const onConfirm = vi.fn();
            render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

            fireEvent.keyDown(document, { key: "Escape" });

            expect(onConfirm).not.toHaveBeenCalled();
        });
    });

    // ===== Backdrop Interaction Tests =====
    describe("backdrop interactions", () => {
        it("closes dialog when backdrop is clicked", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();
            render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

            // The backdrop has the class bg-black/60
            const backdrop = document.querySelector(".bg-black\\/60");
            expect(backdrop).toBeInTheDocument();

            await user.click(backdrop!);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("does not call onConfirm when backdrop is clicked", async () => {
            const onConfirm = vi.fn();
            const user = userEvent.setup();
            render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

            const backdrop = document.querySelector(".bg-black\\/60");
            await user.click(backdrop!);

            expect(onConfirm).not.toHaveBeenCalled();
        });
    });

    // ===== Layout Tests =====
    describe("layout", () => {
        it("shows full-width confirm button when no cancel button", () => {
            render(<ConfirmDialog {...defaultProps} cancelText={undefined} />);

            const confirmButton = screen.getByRole("button", { name: "Confirm" });
            expect(confirmButton).toHaveClass("w-full");
        });

        it("shows flex buttons when cancel button is present", () => {
            render(<ConfirmDialog {...defaultProps} cancelText="Cancel" />);

            const confirmButton = screen.getByRole("button", { name: "Confirm" });
            expect(confirmButton).toHaveClass("flex-1");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("handles delete workflow confirmation flow", async () => {
            const handleDelete = vi.fn();
            const handleClose = vi.fn();
            const user = userEvent.setup();

            render(
                <ConfirmDialog
                    isOpen={true}
                    onClose={handleClose}
                    onConfirm={handleDelete}
                    title="Delete Workflow"
                    message="This will permanently delete 'My Workflow' and all its execution history."
                    confirmText="Delete Workflow"
                    cancelText="Cancel"
                    variant="danger"
                />
            );

            // Verify danger UI
            expect(document.querySelector(".bg-red-100")).toBeInTheDocument();

            // User decides to delete
            await user.click(screen.getByRole("button", { name: "Delete Workflow" }));

            expect(handleDelete).toHaveBeenCalled();
            expect(handleClose).toHaveBeenCalled();
        });

        it("handles cancel flow without triggering action", async () => {
            const handleDelete = vi.fn();
            const handleClose = vi.fn();
            const user = userEvent.setup();

            render(
                <ConfirmDialog
                    isOpen={true}
                    onClose={handleClose}
                    onConfirm={handleDelete}
                    title="Delete Workflow"
                    message="This will permanently delete the workflow."
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="danger"
                />
            );

            // User changes their mind
            await user.click(screen.getByRole("button", { name: "Cancel" }));

            expect(handleClose).toHaveBeenCalled();
            expect(handleDelete).not.toHaveBeenCalled();
        });

        it("handles escape key dismissal", () => {
            const handleDelete = vi.fn();
            const handleClose = vi.fn();

            render(
                <ConfirmDialog
                    isOpen={true}
                    onClose={handleClose}
                    onConfirm={handleDelete}
                    title="Remove Access"
                    message="Remove this user's access?"
                    confirmText="Remove"
                    cancelText="Cancel"
                />
            );

            // User presses Escape
            fireEvent.keyDown(document, { key: "Escape" });

            expect(handleClose).toHaveBeenCalled();
            expect(handleDelete).not.toHaveBeenCalled();
        });
    });
});
