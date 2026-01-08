import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { ALL_PROVIDERS, type ValidationError } from "@flowmaestro/shared";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { ProviderConnectionDialog } from "../../../components/connections/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useConnectionStore } from "../../../stores/connectionStore";

interface DatabaseNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

// SQL operations (PostgreSQL, MySQL)
const sqlOperations = [
    { value: "query", label: "Execute Query" },
    { value: "insert", label: "Insert Row" },
    { value: "update", label: "Update Rows" },
    { value: "delete", label: "Delete Rows" },
    { value: "listTables", label: "List Tables" }
];

// MongoDB operations
const mongoOperations = [
    { value: "find", label: "Find Documents" },
    { value: "insertOne", label: "Insert One" },
    { value: "insertMany", label: "Insert Many" },
    { value: "updateOne", label: "Update One" },
    { value: "updateMany", label: "Update Many" },
    { value: "deleteOne", label: "Delete One" },
    { value: "deleteMany", label: "Delete Many" },
    { value: "listCollections", label: "List Collections" },
    { value: "aggregate", label: "Aggregate" }
];

const returnFormats = [
    { value: "array", label: "Array of rows/documents" },
    { value: "single", label: "Single row/document" },
    { value: "count", label: "Count" }
];

// Helper to get operations based on provider
const getOperationsForProvider = (provider: string) => {
    if (provider === "mongodb") {
        return mongoOperations;
    }
    return sqlOperations;
};

// Helper to check if provider is MongoDB
const isMongoProvider = (provider: string) => provider === "mongodb";

export function DatabaseNodeConfig({
    data,
    onUpdate,
    errors: _errors = []
}: DatabaseNodeConfigProps) {
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    // SQL Operation-specific parameters
    const [query, setQuery] = useState(
        ((data.parameters as Record<string, unknown>)?.query as string) || ""
    );
    const [parameters, setParameters] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.parameters || [], null, 2)
    );
    const [returnFormat, setReturnFormat] = useState(
        ((data.parameters as Record<string, unknown>)?.returnFormat as string) || "array"
    );

    // MongoDB Operation-specific parameters
    const [collection, setCollection] = useState(
        ((data.parameters as Record<string, unknown>)?.collection as string) || ""
    );
    const [filter, setFilter] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.filter || {}, null, 2)
    );
    const [document, setDocument] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.document || {}, null, 2)
    );
    const [documents, setDocuments] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.documents || [], null, 2)
    );
    const [update, setUpdate] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.update || {}, null, 2)
    );
    const [pipeline, setPipeline] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.pipeline || [], null, 2)
    );

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Get selected connection and provider info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    // Handle connection selection from dialog
    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);
    };

    useEffect(() => {
        // Parse JSON parameters
        const parseJSON = (str: string, fallback: unknown = {}) => {
            try {
                return JSON.parse(str);
            } catch {
                return fallback;
            }
        };

        // Build config based on operation
        const config: Record<string, unknown> = {
            connectionId,
            provider,
            operation,
            outputVariable,
            parameters: {
                nodeId: data.id,
                outputVariable
            }
        };

        // SQL operations (PostgreSQL, MySQL)
        if (!isMongoProvider(provider)) {
            if (operation === "query") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    query,
                    parameters: parseJSON(parameters, []),
                    returnFormat
                };
            } else if (operation === "insert") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    table: (data.parameters as Record<string, unknown>)?.table || "",
                    data: {},
                    returning: []
                };
            } else if (operation === "update") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    table: (data.parameters as Record<string, unknown>)?.table || "",
                    data: {},
                    where: "",
                    whereParameters: [],
                    returning: []
                };
            } else if (operation === "delete") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    table: (data.parameters as Record<string, unknown>)?.table || "",
                    where: "",
                    whereParameters: [],
                    returning: []
                };
            } else if (operation === "listTables") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    schema: "public"
                };
            }
        } else {
            // MongoDB operations
            if (operation === "find") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    filter: parseJSON(filter, {}),
                    returnFormat
                };
            } else if (operation === "insertOne") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    document: parseJSON(document, {})
                };
            } else if (operation === "insertMany") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    documents: parseJSON(documents, [])
                };
            } else if (operation === "updateOne" || operation === "updateMany") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    filter: parseJSON(filter, {}),
                    update: parseJSON(update, {})
                };
            } else if (operation === "deleteOne" || operation === "deleteMany") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    filter: parseJSON(filter, {})
                };
            } else if (operation === "listCollections") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    nameOnly: true
                };
            } else if (operation === "aggregate") {
                config.parameters = {
                    ...(config.parameters as Record<string, unknown>),
                    collection,
                    pipeline: parseJSON(pipeline, [])
                };
            }
        }

        onUpdate(config);
    }, [
        connectionId,
        provider,
        operation,
        query,
        parameters,
        returnFormat,
        outputVariable,
        collection,
        filter,
        document,
        documents,
        update,
        pipeline
    ]);

    // Reset operation when provider changes
    useEffect(() => {
        if (provider) {
            const availableOps = getOperationsForProvider(provider);
            // If current operation is not valid for the new provider, reset it
            if (!availableOps.find((op) => op.value === operation)) {
                setOperation(availableOps[0]?.value || "");
            }
        }
    }, [provider]);

    const getQueryPlaceholder = () => {
        switch (operation) {
            case "query":
                return "SELECT * FROM users WHERE age > $1";
            case "insert":
                return "INSERT INTO users (name, email) VALUES ($1, $2)";
            case "update":
                return "UPDATE users SET status = $1 WHERE id = $2";
            case "delete":
                return "DELETE FROM users WHERE id = $1";
            default:
                return "";
        }
    };

    const getFilterPlaceholder = () => {
        switch (operation) {
            case "find":
                return '{ "status": "active", "age": { "$gte": 18 } }';
            case "updateOne":
            case "updateMany":
                return '{ "_id": "..." }';
            case "deleteOne":
            case "deleteMany":
                return '{ "_id": "..." }';
            default:
                return "{}";
        }
    };

    const getDocumentPlaceholder = () => {
        return '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30\n}';
    };

    const getUpdatePlaceholder = () => {
        return '{\n  "$set": { "status": "active" },\n  "$inc": { "views": 1 }\n}';
    };

    const getPipelinePlaceholder = () => {
        return '[\n  { "$match": { "status": "active" } },\n  { "$group": { "_id": "$category", "count": { "$sum": 1 } } },\n  { "$sort": { "count": -1 } }\n]';
    };

    return (
        <>
            <FormSection title="Database">
                <FormField label="Database Connection">
                    {provider && selectedConnection ? (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                            {/* Provider Icon */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                {providerInfo?.logoUrl ? (
                                    <img
                                        src={providerInfo.logoUrl}
                                        alt={providerInfo.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-200 rounded" />
                                )}
                            </div>

                            {/* Connection Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm text-gray-900">
                                        {providerInfo?.displayName || provider}
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                    {selectedConnection.name}
                                </p>
                                {selectedConnection.metadata?.account_info?.email && (
                                    <p className="text-xs text-gray-500 truncate">
                                        {selectedConnection.metadata.account_info.email}
                                    </p>
                                )}
                            </div>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-muted-foreground bg-muted/50 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Select or Add Connection
                        </button>
                    )}
                </FormField>
            </FormSection>

            <FormSection title="Operation">
                <FormField label="Type">
                    <Select
                        value={operation}
                        onChange={setOperation}
                        options={getOperationsForProvider(provider)}
                    />
                </FormField>

                {/* SQL Operations (PostgreSQL, MySQL) */}
                {!isMongoProvider(provider) && operation === "query" && (
                    <>
                        <FormField
                            label="SQL Query"
                            description="Use $1, $2, etc. for parameterized queries"
                        >
                            <CodeInput
                                value={query}
                                onChange={setQuery}
                                language="sql"
                                placeholder={getQueryPlaceholder()}
                                rows={6}
                            />
                        </FormField>

                        <FormField
                            label="Query Parameters"
                            description="JSON array of parameter values"
                        >
                            <Textarea
                                value={parameters}
                                onChange={(e) => setParameters(e.target.value)}
                                placeholder='["value1", "value2"]'
                                rows={4}
                                className="font-mono"
                            />
                        </FormField>

                        <FormField label="Return Format">
                            <Select
                                value={returnFormat}
                                onChange={setReturnFormat}
                                options={returnFormats}
                            />
                        </FormField>

                        <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400 rounded-lg">
                            <p className="text-xs text-yellow-800">
                                <strong>Security:</strong> Always use parameterized queries ($1, $2)
                                to prevent SQL injection attacks.
                            </p>
                        </div>
                    </>
                )}

                {!isMongoProvider(provider) && operation === "listTables" && (
                    <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                        <p className="text-sm text-blue-800">
                            This operation will list all tables in the database.
                        </p>
                    </div>
                )}

                {!isMongoProvider(provider) &&
                    (operation === "insert" ||
                        operation === "update" ||
                        operation === "delete") && (
                        <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                            <p className="text-sm text-blue-800">
                                For {operation} operations, please use the Query operation with a
                                custom SQL statement.
                            </p>
                        </div>
                    )}

                {/* MongoDB Operations */}
                {isMongoProvider(provider) && operation === "find" && (
                    <>
                        <FormField label="Collection" description="Name of the collection to query">
                            <Input
                                type="text"
                                value={collection}
                                onChange={(e) => setCollection(e.target.value)}
                                placeholder="users"
                            />
                        </FormField>

                        <FormField label="Filter" description="MongoDB query filter (JSON)">
                            <CodeInput
                                value={filter}
                                onChange={setFilter}
                                language="json"
                                placeholder={getFilterPlaceholder()}
                                rows={6}
                            />
                        </FormField>

                        <FormField label="Return Format">
                            <Select
                                value={returnFormat}
                                onChange={setReturnFormat}
                                options={returnFormats}
                            />
                        </FormField>
                    </>
                )}

                {isMongoProvider(provider) && operation === "insertOne" && (
                    <>
                        <FormField label="Collection" description="Name of the collection">
                            <Input
                                type="text"
                                value={collection}
                                onChange={(e) => setCollection(e.target.value)}
                                placeholder="users"
                            />
                        </FormField>

                        <FormField label="Document" description="Document to insert (JSON)">
                            <CodeInput
                                value={document}
                                onChange={setDocument}
                                language="json"
                                placeholder={getDocumentPlaceholder()}
                                rows={8}
                            />
                        </FormField>
                    </>
                )}

                {isMongoProvider(provider) && operation === "insertMany" && (
                    <>
                        <FormField label="Collection" description="Name of the collection">
                            <Input
                                type="text"
                                value={collection}
                                onChange={(e) => setCollection(e.target.value)}
                                placeholder="users"
                            />
                        </FormField>

                        <FormField
                            label="Documents"
                            description="Array of documents to insert (JSON)"
                        >
                            <CodeInput
                                value={documents}
                                onChange={setDocuments}
                                language="json"
                                placeholder={"[\n  " + getDocumentPlaceholder() + "\n]"}
                                rows={10}
                            />
                        </FormField>
                    </>
                )}

                {isMongoProvider(provider) &&
                    (operation === "updateOne" || operation === "updateMany") && (
                        <>
                            <FormField label="Collection" description="Name of the collection">
                                <Input
                                    type="text"
                                    value={collection}
                                    onChange={(e) => setCollection(e.target.value)}
                                    placeholder="users"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </FormField>

                            <FormField
                                label="Filter"
                                description="Query filter to find document(s) to update"
                            >
                                <CodeInput
                                    value={filter}
                                    onChange={setFilter}
                                    language="json"
                                    placeholder={getFilterPlaceholder()}
                                    rows={4}
                                />
                            </FormField>

                            <FormField
                                label="Update"
                                description="Update operations using MongoDB update operators"
                            >
                                <CodeInput
                                    value={update}
                                    onChange={setUpdate}
                                    language="json"
                                    placeholder={getUpdatePlaceholder()}
                                    rows={6}
                                />
                            </FormField>
                        </>
                    )}

                {isMongoProvider(provider) &&
                    (operation === "deleteOne" || operation === "deleteMany") && (
                        <>
                            <FormField label="Collection" description="Name of the collection">
                                <Input
                                    type="text"
                                    value={collection}
                                    onChange={(e) => setCollection(e.target.value)}
                                    placeholder="users"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </FormField>

                            <FormField
                                label="Filter"
                                description="Query filter to find document(s) to delete"
                            >
                                <CodeInput
                                    value={filter}
                                    onChange={setFilter}
                                    language="json"
                                    placeholder={getFilterPlaceholder()}
                                    rows={6}
                                />
                            </FormField>

                            <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                    <strong>Warning:</strong> This operation will permanently delete
                                    document(s). Make sure your filter is correct.
                                </p>
                            </div>
                        </>
                    )}

                {isMongoProvider(provider) && operation === "listCollections" && (
                    <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                        <p className="text-sm text-blue-800">
                            This operation will list all collections in the database.
                        </p>
                    </div>
                )}

                {isMongoProvider(provider) && operation === "aggregate" && (
                    <>
                        <FormField label="Collection" description="Name of the collection">
                            <Input
                                type="text"
                                value={collection}
                                onChange={(e) => setCollection(e.target.value)}
                                placeholder="orders"
                            />
                        </FormField>

                        <FormField
                            label="Aggregation Pipeline"
                            description="Array of aggregation stages"
                        >
                            <CodeInput
                                value={pipeline}
                                onChange={setPipeline}
                                language="json"
                                placeholder={getPipelinePlaceholder()}
                                rows={12}
                            />
                        </FormField>

                        <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                            <p className="text-xs text-blue-800">
                                <strong>Tip:</strong> Common stages: $match, $group, $sort,
                                $project, $lookup, $unwind, $limit, $skip
                            </p>
                        </div>
                    </>
                )}
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Database"}
                    nodeType="database"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Provider Connection Dialog */}
            <ProviderConnectionDialog
                isOpen={isProviderDialogOpen}
                onClose={() => setIsProviderDialogOpen(false)}
                selectedConnectionId={connectionId}
                defaultCategory="Databases"
                onSelect={handleConnectionSelect}
            />
        </>
    );
}
