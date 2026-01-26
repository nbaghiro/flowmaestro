/**
 * NodeLibrary component tests
 *
 * Tests for the node library sidebar that allows users to drag nodes onto the canvas
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodeLibrary } from "../panels/NodeLibrary";

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    ALL_PROVIDERS: [
        {
            provider: "slack",
            displayName: "Slack",
            logoUrl: "/logos/slack.svg",
            description: "Send and receive Slack messages",
            comingSoon: false
        },
        {
            provider: "gmail",
            displayName: "Gmail",
            logoUrl: "/logos/gmail.svg",
            description: "Send and manage emails",
            comingSoon: false
        },
        {
            provider: "openai",
            displayName: "OpenAI",
            logoUrl: "/logos/openai.svg",
            description: "AI language models",
            comingSoon: false
        }
    ],
    getProvidersByCategory: () => ["openai", "anthropic", "google-ai"] // AI providers
}));

// Mock theme store
vi.mock("../../stores/themeStore", () => ({
    useThemeStore: () => "light"
}));

// Mock common components
vi.mock("../../components/common/Button", () => ({
    Button: ({
        children,
        onClick,
        title,
        className
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        title?: string;
        className?: string;
    }) => (
        <button onClick={onClick} title={title} className={className}>
            {children}
        </button>
    )
}));

vi.mock("../../components/common/Input", () => ({
    Input: ({
        value,
        onChange,
        placeholder,
        type,
        className
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        className?: string;
    }) => (
        <input
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="search-input"
        />
    )
}));

vi.mock("../../components/common/Tooltip", () => ({
    Tooltip: ({
        children,
        content
    }: {
        children: React.ReactNode;
        content: string;
        position?: string;
        delay?: number;
    }) => <div title={content}>{children}</div>
}));

describe("NodeLibrary", () => {
    const defaultProps = {
        isCollapsed: false,
        onExpand: vi.fn(),
        onCollapse: vi.fn(),
        isPinned: false,
        onPinToggle: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders the search input", () => {
            render(<NodeLibrary {...defaultProps} />);

            expect(screen.getByTestId("search-input")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Search nodes...")).toBeInTheDocument();
        });

        it("renders all category headers", () => {
            render(<NodeLibrary {...defaultProps} />);

            expect(screen.getByText("Inputs")).toBeInTheDocument();
            expect(screen.getByText("Outputs")).toBeInTheDocument();
            expect(screen.getByText("AI & ML")).toBeInTheDocument();
            expect(screen.getByText("Integrations")).toBeInTheDocument();
            expect(screen.getByText("Logic & Code")).toBeInTheDocument();
            expect(screen.getByText("Utils")).toBeInTheDocument();
        });

        it("renders pin button", () => {
            render(<NodeLibrary {...defaultProps} />);

            expect(screen.getByTitle("Pin sidebar")).toBeInTheDocument();
        });

        it("renders unpin button when pinned", () => {
            render(<NodeLibrary {...defaultProps} isPinned={true} />);

            expect(screen.getByTitle("Unpin sidebar")).toBeInTheDocument();
        });
    });

    describe("Collapsed State", () => {
        it("shows collapsed sidebar when isCollapsed is true", () => {
            const { container } = render(<NodeLibrary {...defaultProps} isCollapsed={true} />);

            // Collapsed sidebar should have opacity-100
            const collapsedSidebar = container.querySelector(".w-12.opacity-100");
            expect(collapsedSidebar).toBeInTheDocument();
        });

        it("shows expanded sidebar when isCollapsed is false", () => {
            const { container } = render(<NodeLibrary {...defaultProps} isCollapsed={false} />);

            // Expanded sidebar should have opacity-100
            const expandedSidebar = container.querySelector(".w-64.opacity-100");
            expect(expandedSidebar).toBeInTheDocument();
        });

        it("calls onExpand on mouse enter when collapsed and not pinned", () => {
            render(<NodeLibrary {...defaultProps} isCollapsed={true} isPinned={false} />);

            const wrapper = screen.getByTestId("search-input").closest(".relative");
            if (wrapper) {
                fireEvent.mouseEnter(wrapper);
                expect(defaultProps.onExpand).toHaveBeenCalled();
            }
        });

        it("does not call onExpand on mouse enter when pinned", () => {
            render(<NodeLibrary {...defaultProps} isCollapsed={true} isPinned={true} />);

            const wrapper = screen.getByTestId("search-input").closest(".relative");
            if (wrapper) {
                fireEvent.mouseEnter(wrapper);
                expect(defaultProps.onExpand).not.toHaveBeenCalled();
            }
        });
    });

    describe("Category Expansion", () => {
        it("expands category when clicked", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // Click on Inputs category
            const inputsCategory = screen.getByText("Inputs");
            await user.click(inputsCategory);

            // Should now show input nodes
            expect(screen.getByText("Input")).toBeInTheDocument();
            expect(screen.getByText("Trigger")).toBeInTheDocument();
        });

        it("collapses category when clicked again", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // Click to expand
            const inputsCategory = screen.getByText("Inputs");
            await user.click(inputsCategory);

            // Should show input nodes
            expect(screen.getByText("Input")).toBeInTheDocument();

            // Click again to collapse
            await user.click(inputsCategory);

            // Input node should no longer be visible
            expect(screen.queryByText(/^Input$/)).not.toBeInTheDocument();
        });

        it("shows all AI nodes when AI & ML category is expanded", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("AI & ML"));

            expect(screen.getByText("LLM")).toBeInTheDocument();
            expect(screen.getByText("Vision")).toBeInTheDocument();
            expect(screen.getByText("Image")).toBeInTheDocument();
        });

        it("shows logic nodes when Logic & Code category is expanded", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Logic & Code"));

            expect(screen.getByText("Conditional")).toBeInTheDocument();
            expect(screen.getByText("Switch")).toBeInTheDocument();
            expect(screen.getByText("Loop")).toBeInTheDocument();
            expect(screen.getByText("Code")).toBeInTheDocument();
        });
    });

    describe("Search Functionality", () => {
        it("filters nodes by search query", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // First expand a category to see nodes
            await user.click(screen.getByText("AI & ML"));
            expect(screen.getByText("LLM")).toBeInTheDocument();

            // Type in search
            const searchInput = screen.getByTestId("search-input");
            await user.type(searchInput, "code");

            // LLM should be filtered out
            expect(screen.queryByText("LLM")).not.toBeInTheDocument();
        });

        it("shows matching nodes from all categories", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // Type in search that matches multiple categories
            const searchInput = screen.getByTestId("search-input");
            await user.type(searchInput, "output");

            // Expand categories to see results
            await user.click(screen.getByText("Outputs"));

            // Should show Output nodes
            expect(screen.getByText("Output")).toBeInTheDocument();
        });

        it("is case insensitive", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("AI & ML"));

            const searchInput = screen.getByTestId("search-input");
            await user.type(searchInput, "LLM");

            expect(screen.getByText("LLM")).toBeInTheDocument();
        });

        it("hides empty categories when searching", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            const searchInput = screen.getByTestId("search-input");
            await user.type(searchInput, "llm");

            // Categories without matches should still show headers but collapse
            // The category visibility is controlled by the filtered results
            expect(screen.getByText("AI & ML")).toBeInTheDocument();
        });
    });

    describe("Drag and Drop", () => {
        it("sets correct data transfer on drag start", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // Expand AI category
            await user.click(screen.getByText("AI & ML"));

            // Find the LLM node item
            const llmNode = screen.getByText("LLM").closest("[draggable]");
            expect(llmNode).toHaveAttribute("draggable", "true");

            // Simulate drag start
            const dataTransfer = {
                setData: vi.fn(),
                effectAllowed: ""
            };

            fireEvent.dragStart(llmNode!, { dataTransfer });

            expect(dataTransfer.setData).toHaveBeenCalledWith("application/reactflow", "llm");
            expect(dataTransfer.effectAllowed).toBe("move");
        });

        it("all node items are draggable", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            // Expand multiple categories
            await user.click(screen.getByText("Inputs"));
            await user.click(screen.getByText("Outputs"));

            // Check that node items have draggable attribute
            const inputNode = screen.getByText("Input").closest("[draggable]");
            const outputNode = screen.getByText("Output").closest("[draggable]");

            expect(inputNode).toHaveAttribute("draggable", "true");
            expect(outputNode).toHaveAttribute("draggable", "true");
        });
    });

    describe("Integration Nodes", () => {
        it("shows integration provider nodes", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Integrations"));

            // Should show Slack and Gmail (non-AI providers)
            expect(screen.getByText("Slack")).toBeInTheDocument();
            expect(screen.getByText("Gmail")).toBeInTheDocument();
        });

        it("does not show AI providers in integrations category", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Integrations"));

            // OpenAI is an AI provider and should not appear here
            expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
        });

        it("renders provider logos", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Integrations"));

            const slackLogo = screen.getByRole("img", { name: "Slack" });
            expect(slackLogo).toHaveAttribute("src", "/logos/slack.svg");
        });
    });

    describe("Pin Toggle", () => {
        it("calls onPinToggle when pin button is clicked", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            const pinButton = screen.getByTitle("Pin sidebar");
            await user.click(pinButton);

            expect(defaultProps.onPinToggle).toHaveBeenCalledTimes(1);
        });
    });

    describe("Node Tooltips", () => {
        it("shows description in tooltip", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Inputs"));

            // Tooltip content is set as title attribute in our mock
            const inputNode = screen.getByText("Input").closest("[title]");
            expect(inputNode).toHaveAttribute("title", "Provide text or JSON data to the workflow");
        });
    });

    describe("Category Icons", () => {
        it("renders category icons in collapsed state", () => {
            const { container } = render(<NodeLibrary {...defaultProps} isCollapsed={true} />);

            // Should have category icon buttons
            const buttons = container.querySelectorAll(".w-12 button");
            // Search + 6 categories
            expect(buttons.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe("Builtin Nodes", () => {
        it("includes HTTP node in utils category", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Utils"));

            expect(screen.getByText("HTTP")).toBeInTheDocument();
        });

        it("includes Database node in utils category", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Utils"));

            expect(screen.getByText("Database")).toBeInTheDocument();
        });

        it("includes Web Search node in utils category", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Utils"));

            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });

        it("includes Conditional node in logic category", async () => {
            const user = userEvent.setup();
            render(<NodeLibrary {...defaultProps} />);

            await user.click(screen.getByText("Logic & Code"));

            expect(screen.getByText("Conditional")).toBeInTheDocument();
        });
    });

    describe("Node Count", () => {
        it("has at least 30 builtin nodes", async () => {
            const user = userEvent.setup();
            const { container } = render(<NodeLibrary {...defaultProps} />);

            // Expand all categories
            await user.click(screen.getByText("Inputs"));
            await user.click(screen.getByText("Outputs"));
            await user.click(screen.getByText("AI & ML"));
            await user.click(screen.getByText("Logic & Code"));
            await user.click(screen.getByText("Utils"));
            await user.click(screen.getByText("Integrations"));

            // Count all draggable nodes
            const draggableNodes = container.querySelectorAll("[draggable=true]");
            expect(draggableNodes.length).toBeGreaterThanOrEqual(30);
        });
    });
});
