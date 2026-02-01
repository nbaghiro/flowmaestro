/**
 * DatabaseNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseNodeConfig } from "../../configs/DatabaseNodeConfig";

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    ALL_PROVIDERS: [
        { provider: "postgresql", displayName: "PostgreSQL", logoUrl: "/logos/postgresql.svg" },
        { provider: "mysql", displayName: "MySQL", logoUrl: "/logos/mysql.svg" },
        { provider: "mongodb", displayName: "MongoDB", logoUrl: "/logos/mongodb.svg" }
    ]
}));

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
        type,
        placeholder
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
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

vi.mock("../../../../components/CodeInput", () => ({
    CodeInput: ({
        value,
        onChange,
        placeholder,
        language
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        language?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="code-input"
            data-language={language}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    )
}));

vi.mock("../../../../components/connections/dialogs/ProviderConnectionDialog", () => ({
    ProviderConnectionDialog: ({
        isOpen,
        onClose,
        onSelect
    }: {
        isOpen: boolean;
        onClose: () => void;
        onSelect: (provider: string, connectionId: string) => void;
    }) =>
        isOpen ? (
            <div data-testid="provider-dialog">
                <button onClick={onClose}>Close</button>
                <button onClick={() => onSelect("postgresql", "conn-1")}>Select PostgreSQL</button>
                <button onClick={() => onSelect("mongodb", "conn-2")}>Select MongoDB</button>
            </div>
        ) : null
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
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

vi.mock("../../../../stores/connectionStore", () => ({
    useConnectionStore: () => ({
        connections: [
            { id: "conn-1", provider: "postgresql", name: "PostgreSQL DB", status: "active" },
            { id: "conn-2", provider: "mongodb", name: "MongoDB Atlas", status: "active" }
        ],
        fetchConnections: vi.fn()
    })
}));

describe("DatabaseNodeConfig", () => {
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

    describe("Rendering", () => {
        it("renders Database section", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-database")).toBeInTheDocument();
        });

        it("renders Operation section", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-operation")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Database Connection field", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByText("Database Connection")).toBeInTheDocument();
        });

        it("renders Type field", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByText("Type")).toBeInTheDocument();
        });
    });

    describe("Connection Selection", () => {
        it("shows Select or Add Connection button when no connection", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(screen.getByText("Select or Add Connection")).toBeInTheDocument();
        });

        it("opens provider dialog when button clicked", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));

            expect(screen.getByTestId("provider-dialog")).toBeInTheDocument();
        });

        it("selects PostgreSQL connection from dialog", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe("postgresql");
            expect(lastCall.connectionId).toBe("conn-1");
        });
    });

    describe("SQL Operations", () => {
        it("shows Execute Query option for SQL provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            expect(screen.getByText("Execute Query")).toBeInTheDocument();
        });

        it("shows Insert Row option for SQL provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            expect(screen.getByText("Insert Row")).toBeInTheDocument();
        });

        it("shows Update Rows option for SQL provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            expect(screen.getByText("Update Rows")).toBeInTheDocument();
        });

        it("shows Delete Rows option for SQL provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            expect(screen.getByText("Delete Rows")).toBeInTheDocument();
        });

        it("shows List Tables option for SQL provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select PostgreSQL"));

            expect(screen.getByText("List Tables")).toBeInTheDocument();
        });
    });

    describe("MongoDB Operations", () => {
        it("shows Find Documents option for MongoDB provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select MongoDB"));

            expect(screen.getByText("Find Documents")).toBeInTheDocument();
        });

        it("shows Insert One option for MongoDB provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select MongoDB"));

            expect(screen.getByText("Insert One")).toBeInTheDocument();
        });

        it("shows Aggregate option for MongoDB provider", async () => {
            const user = userEvent.setup();
            render(<DatabaseNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));
            await user.click(screen.getByText("Select MongoDB"));

            expect(screen.getByText("Aggregate")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", connectionId: "conn-1" }}
                />
            );
            // Provider is loaded, should show PostgreSQL
            expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
        });

        it("loads existing operation from data", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("query");
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<DatabaseNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when operation changes", async () => {
            const user = userEvent.setup();
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "listTables");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.operation).toBe("listTables");
        });
    });

    describe("SQL Query Fields", () => {
        it("shows SQL Query field for query operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );
            expect(screen.getByText("SQL Query")).toBeInTheDocument();
        });

        it("shows Query Parameters field for query operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );
            expect(screen.getByText("Query Parameters")).toBeInTheDocument();
        });

        it("shows Return Format field for query operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );
            expect(screen.getByText("Return Format")).toBeInTheDocument();
        });

        it("shows security warning for SQL queries", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "postgresql", operation: "query" }}
                />
            );
            expect(screen.getByText(/Security:/)).toBeInTheDocument();
        });
    });

    describe("MongoDB Query Fields", () => {
        it("shows Collection field for find operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "mongodb", operation: "find" }}
                />
            );
            expect(screen.getByText("Collection")).toBeInTheDocument();
        });

        it("shows Filter field for find operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "mongodb", operation: "find" }}
                />
            );
            expect(screen.getByText("Filter")).toBeInTheDocument();
        });

        it("shows Document field for insertOne operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "mongodb", operation: "insertOne" }}
                />
            );
            expect(screen.getByText("Document")).toBeInTheDocument();
        });

        it("shows Aggregation Pipeline field for aggregate operation", () => {
            render(
                <DatabaseNodeConfig
                    {...defaultProps}
                    data={{ provider: "mongodb", operation: "aggregate" }}
                />
            );
            expect(screen.getByText("Aggregation Pipeline")).toBeInTheDocument();
        });
    });
});
