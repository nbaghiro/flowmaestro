/**
 * ActionNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionNodeConfig } from "../../configs/ActionNodeConfig";

// Mock common form components
vi.mock("../../../../components/common/FormField", () => ({
    FormField: ({
        label,
        description,
        children
    }: {
        label: string;
        description?: string;
        children: React.ReactNode;
    }) => (
        <div data-testid={`form-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <label>{label}</label>
            {description && <span className="description">{description}</span>}
            {children}
        </div>
    ),
    FormSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div data-testid={`form-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            <h3>{title}</h3>
            {children}
        </div>
    )
}));

vi.mock("../../../../components/common/Input", () => ({
    Input: ({
        value,
        onChange,
        placeholder,
        type
    }: {
        value?: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
    }) => (
        <input
            data-testid="input"
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

vi.mock("../../../../components/common/Select", () => ({
    Select: ({
        value,
        onChange,
        options
    }: {
        value: string;
        onChange: (value: string) => void;
        options: Array<{ value: string; label: string }>;
    }) => (
        <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    )
}));

vi.mock("../../../../components/common/Textarea", () => ({
    Textarea: ({
        value,
        onChange,
        placeholder,
        rows
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        placeholder?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="textarea"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
        />
    )
}));

vi.mock("../../../../components/OutputSettingsSection", () => ({
    OutputSettingsSection: ({
        value,
        onChange
    }: {
        nodeName: string;
        nodeType: string;
        value: string;
        onChange: (value: string) => void;
    }) => (
        <div data-testid="output-settings-section">
            <input
                data-testid="output-variable-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}));

vi.mock("../../../../components/actions/ActionProviderList", () => ({
    ActionProviderList: ({
        onSelectProvider
    }: {
        onSelectProvider: (provider: {
            providerId: string;
            name: string;
            description: string;
            logoUrl?: string;
            category: string;
            actionCount: number;
        }) => void;
    }) => (
        <div data-testid="action-provider-list">
            <button
                onClick={() =>
                    onSelectProvider({
                        providerId: "slack",
                        name: "Slack",
                        description: "Messaging platform",
                        logoUrl: "https://example.com/slack.png",
                        category: "Communication",
                        actionCount: 5
                    })
                }
            >
                Select Slack
            </button>
        </div>
    )
}));

vi.mock("../../../../components/actions/ActionOperationList", () => ({
    ActionOperationList: ({
        onSelectOperation,
        onBack
    }: {
        provider: { providerId: string; name: string };
        onSelectOperation: (operation: {
            id: string;
            name: string;
            description: string;
            actionType: string;
            parameters: Array<{
                name: string;
                type: string;
                required: boolean;
                description?: string;
            }>;
        }) => void;
        onBack: () => void;
    }) => (
        <div data-testid="action-operation-list">
            <button onClick={onBack}>Back</button>
            <button
                onClick={() =>
                    onSelectOperation({
                        id: "send_message",
                        name: "Send Message",
                        description: "Send a message to a channel",
                        actionType: "write",
                        parameters: [
                            { name: "channel", type: "string", required: true },
                            { name: "text", type: "string", required: true }
                        ]
                    })
                }
            >
                Select Send Message
            </button>
        </div>
    )
}));

vi.mock("../../../../components/connections/dialogs/NewConnectionDialog", () => ({
    NewConnectionDialog: () => <div data-testid="new-connection-dialog" />
}));

vi.mock("../../../../stores/connectionStore", () => ({
    useConnectionStore: () => ({
        connections: [
            {
                id: "conn-1",
                provider: "slack",
                name: "My Slack",
                status: "active"
            }
        ],
        fetchConnections: vi.fn()
    })
}));

vi.mock("../../../../lib/utils", () => ({
    cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ")
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
    ChevronLeft: () => <span data-testid="chevron-left">ChevronLeft</span>,
    Play: () => <span data-testid="play-icon">Play</span>,
    AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>
}));

// Mock shared module
vi.mock("@flowmaestro/shared", () => ({
    ALL_PROVIDERS: [
        {
            provider: "slack",
            displayName: "Slack",
            logoUrl: "https://example.com/slack.png",
            methods: ["oauth2"]
        }
    ]
}));

describe("ActionNodeConfig", () => {
    const mockOnUpdate = vi.fn();

    const defaultProps = {
        nodeId: "node-1",
        data: {},
        onUpdate: mockOnUpdate,
        errors: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Initial State - Provider List", () => {
        it("renders Select Integration section", () => {
            render(<ActionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-select-integration")).toBeInTheDocument();
        });

        it("shows provider list when no provider is selected", () => {
            render(<ActionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("action-provider-list")).toBeInTheDocument();
        });

        it("displays instruction text", () => {
            render(<ActionNodeConfig {...defaultProps} />);
            expect(
                screen.getByText("Please select an integration to perform an action.")
            ).toBeInTheDocument();
        });
    });

    describe("Provider Selection Flow", () => {
        it("shows operation list after selecting provider", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));

            expect(screen.getByTestId("action-operation-list")).toBeInTheDocument();
        });

        it("can navigate back from operation list to provider list", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            expect(screen.getByTestId("action-operation-list")).toBeInTheDocument();

            await user.click(screen.getByText("Back"));

            expect(screen.getByTestId("action-provider-list")).toBeInTheDocument();
        });
    });

    describe("Operation Selection Flow", () => {
        it("shows operation config after selecting operation", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByTestId("form-section-action-configuration")).toBeInTheDocument();
        });

        it("shows provider and operation info in config view", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByText("Send Message")).toBeInTheDocument();
            expect(screen.getByText("Slack")).toBeInTheDocument();
        });

        it("shows change action button", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByText("Change action")).toBeInTheDocument();
        });

        it("shows change provider button", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByText("Change provider")).toBeInTheDocument();
        });
    });

    describe("Operation Configuration", () => {
        it("shows Parameters section when operation has parameters", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByTestId("form-section-parameters")).toBeInTheDocument();
        });

        it("shows Output Settings section", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider and operation from data", () => {
            render(
                <ActionNodeConfig
                    {...defaultProps}
                    data={{
                        provider: "slack",
                        providerName: "Slack",
                        operation: "send_message",
                        operationName: "Send Message",
                        operationParameters: [
                            { name: "channel", type: "string", required: true },
                            { name: "text", type: "string", required: true }
                        ],
                        connectionId: "conn-1"
                    }}
                />
            );

            expect(screen.getByTestId("form-section-action-configuration")).toBeInTheDocument();
            expect(screen.getByText("Send Message")).toBeInTheDocument();
        });

        it("loads existing outputVariable from data", () => {
            render(
                <ActionNodeConfig
                    {...defaultProps}
                    data={{
                        provider: "slack",
                        providerName: "Slack",
                        operation: "send_message",
                        operationName: "Send Message",
                        operationParameters: [],
                        connectionId: "conn-1",
                        outputVariable: "slackResponse"
                    }}
                />
            );

            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("slackResponse");
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<ActionNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when operation is selected", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });
        });

        it("calls onUpdate with provider and operation info", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            await waitFor(() => {
                const calls = mockOnUpdate.mock.calls;
                const lastCall = calls[calls.length - 1][0];
                expect(lastCall.provider).toBe("slack");
                expect(lastCall.operation).toBe("send_message");
            });
        });
    });

    describe("Connection Status", () => {
        it("shows connected status when connection exists", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            await waitFor(() => {
                expect(screen.getByText(/Connected: My Slack/)).toBeInTheDocument();
            });
        });
    });

    describe("Navigation", () => {
        it("can navigate back from config to operation list", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            await user.click(screen.getByText("Change action"));

            expect(screen.getByTestId("action-operation-list")).toBeInTheDocument();
        });

        it("can navigate back from config to provider list", async () => {
            const user = userEvent.setup();
            render(<ActionNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select Slack"));
            await user.click(screen.getByText("Select Send Message"));

            await user.click(screen.getByText("Change provider"));

            expect(screen.getByTestId("action-provider-list")).toBeInTheDocument();
        });
    });
});
