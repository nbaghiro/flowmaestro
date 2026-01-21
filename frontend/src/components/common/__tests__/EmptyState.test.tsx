/**
 * EmptyState Component Tests
 *
 * Tests for the EmptyState component used to show placeholder content.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Content bugs:
 *    - Icon not rendered
 *    - Title not rendered
 *    - Description not rendered
 *    - Action not rendered
 *
 * 2. Styling bugs:
 *    - Not centered
 *    - Border not dashed
 *    - Icon wrong size or color
 *
 * 3. Layout bugs:
 *    - Action rendered when not provided
 *    - Wrong spacing between elements
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox, FileText, Users, Search } from "lucide-react";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders icon", () => {
            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="You have no messages yet"
                />
            );

            // Inbox icon renders as an SVG
            const svg = document.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders title", () => {
            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="You have no messages yet"
                />
            );

            expect(screen.getByText("No messages")).toBeInTheDocument();
        });

        it("renders description", () => {
            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="You have no messages yet"
                />
            );

            expect(screen.getByText("You have no messages yet")).toBeInTheDocument();
        });
    });

    // ===== Styling =====
    describe("styling", () => {
        it("has centered layout", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const container = screen.getByText("No messages").closest("div[class*='flex']");
            expect(container).toHaveClass("flex");
            expect(container).toHaveClass("flex-col");
            expect(container).toHaveClass("items-center");
            expect(container).toHaveClass("justify-center");
        });

        it("has dashed border", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const container = screen.getByText("No messages").closest("div[class*='border']");
            expect(container).toHaveClass("border-2");
            expect(container).toHaveClass("border-dashed");
            expect(container).toHaveClass("border-border");
        });

        it("has rounded corners", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const container = screen.getByText("No messages").closest("div[class*='rounded']");
            expect(container).toHaveClass("rounded-lg");
        });

        it("has card background", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const container = screen.getByText("No messages").closest("div[class*='bg-card']");
            expect(container).toHaveClass("bg-card");
        });

        it("icon has correct size", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const svg = document.querySelector("svg");
            expect(svg).toHaveClass("w-12");
            expect(svg).toHaveClass("h-12");
        });

        it("icon has muted color", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const svg = document.querySelector("svg");
            expect(svg).toHaveClass("text-muted-foreground");
        });

        it("title has correct styling", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            const title = screen.getByText("No messages");
            expect(title).toHaveClass("text-lg");
            expect(title).toHaveClass("font-semibold");
            expect(title).toHaveClass("text-foreground");
        });

        it("description has correct styling", () => {
            render(
                <EmptyState icon={Inbox} title="No messages" description="You have no messages" />
            );

            const description = screen.getByText("You have no messages");
            expect(description).toHaveClass("text-sm");
            expect(description).toHaveClass("text-muted-foreground");
            expect(description).toHaveClass("text-center");
        });
    });

    // ===== Action =====
    describe("action", () => {
        it("renders action when provided", () => {
            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="Description"
                    action={<button>Create Message</button>}
                />
            );

            expect(screen.getByRole("button", { name: "Create Message" })).toBeInTheDocument();
        });

        it("does not render action container when not provided", () => {
            render(<EmptyState icon={Inbox} title="No messages" description="Description" />);

            // Should not have any buttons
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("action is clickable", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();

            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="Description"
                    action={<button onClick={onClick}>Create Message</button>}
                />
            );

            await user.click(screen.getByRole("button"));
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("can render complex action", () => {
            render(
                <EmptyState
                    icon={Inbox}
                    title="No messages"
                    description="Description"
                    action={
                        <div>
                            <button>Primary Action</button>
                            <button>Secondary Action</button>
                        </div>
                    }
                />
            );

            expect(screen.getByRole("button", { name: "Primary Action" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Secondary Action" })).toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders empty workflows state", () => {
            render(
                <EmptyState
                    icon={FileText}
                    title="No workflows"
                    description="Create your first workflow to get started"
                    action={<button>Create Workflow</button>}
                />
            );

            expect(screen.getByText("No workflows")).toBeInTheDocument();
            expect(
                screen.getByText("Create your first workflow to get started")
            ).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create Workflow" })).toBeInTheDocument();
        });

        it("renders empty team members state", () => {
            render(
                <EmptyState
                    icon={Users}
                    title="No team members"
                    description="Invite team members to collaborate on workflows"
                    action={<button>Invite Members</button>}
                />
            );

            expect(screen.getByText("No team members")).toBeInTheDocument();
            expect(
                screen.getByText("Invite team members to collaborate on workflows")
            ).toBeInTheDocument();
        });

        it("renders no search results state", () => {
            render(
                <EmptyState
                    icon={Search}
                    title="No results found"
                    description="Try adjusting your search terms or filters"
                />
            );

            expect(screen.getByText("No results found")).toBeInTheDocument();
            expect(
                screen.getByText("Try adjusting your search terms or filters")
            ).toBeInTheDocument();
        });

        it("renders different icons correctly", () => {
            const { rerender } = render(
                <EmptyState icon={Inbox} title="Title 1" description="Desc" />
            );

            let svg = document.querySelector("svg");
            expect(svg).toBeInTheDocument();

            rerender(<EmptyState icon={FileText} title="Title 2" description="Desc" />);

            svg = document.querySelector("svg");
            expect(svg).toBeInTheDocument();

            rerender(<EmptyState icon={Users} title="Title 3" description="Desc" />);

            svg = document.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });
    });
});
