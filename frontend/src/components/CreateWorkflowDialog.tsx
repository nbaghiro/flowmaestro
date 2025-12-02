import { X, Upload, FileJson, ChevronRight } from "lucide-react";
import { useState, FormEvent } from "react";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Input } from "./common/Input";
import { Textarea } from "./common/Textarea";
import type { WorkflowDefinition } from "../lib/api";

interface CreateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (
        name: string,
        description?: string,
        definition?: WorkflowDefinition
    ) => Promise<void>;
}

export function CreateWorkflowDialog({ isOpen, onClose, onCreate }: CreateWorkflowDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [jsonInput, setJsonInput] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [parsedWorkflow, setParsedWorkflow] = useState<WorkflowDefinition | null>(null);

    const validateAndParseJSON = (
        json: string
    ): { valid: boolean; data?: WorkflowDefinition; error?: string } => {
        if (!json.trim()) {
            return { valid: true }; // Empty is valid (optional)
        }

        try {
            const parsed = JSON.parse(json);

            // Validate basic structure
            if (!parsed || typeof parsed !== "object") {
                return { valid: false, error: "Invalid JSON: Expected an object" };
            }

            // Check if it has the required workflow structure
            if (!parsed.nodes || typeof parsed.nodes !== "object") {
                return {
                    valid: false,
                    error: "Invalid workflow: Missing 'nodes' property (must be an object)"
                };
            }

            if (!parsed.edges || !Array.isArray(parsed.edges)) {
                return {
                    valid: false,
                    error: "Invalid workflow: Missing or invalid 'edges' property (must be an array)"
                };
            }

            // Validate nodes structure more deeply
            const nodeEntries = Object.entries(parsed.nodes);
            if (nodeEntries.length > 0) {
                for (const [nodeId, node] of nodeEntries) {
                    const nodeObj = node as Record<string, unknown>;
                    if (!nodeObj.type || typeof nodeObj.type !== "string") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing or invalid 'type' property`
                        };
                    }
                    if (!nodeObj.name || typeof nodeObj.name !== "string") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing or invalid 'name' property`
                        };
                    }
                    if (!nodeObj.position || typeof nodeObj.position !== "object") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Missing 'position' property`
                        };
                    }
                    const position = nodeObj.position as Record<string, unknown>;
                    if (typeof position.x !== "number" || typeof position.y !== "number") {
                        return {
                            valid: false,
                            error: `Invalid node '${nodeId}': Position must have x and y coordinates`
                        };
                    }
                }
            }

            // Ensure entryPoint exists if there are nodes
            if (nodeEntries.length > 0 && !parsed.entryPoint) {
                return { valid: false, error: "Invalid workflow: Missing 'entryPoint' property" };
            }

            return { valid: true, data: parsed };
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            return {
                valid: false,
                error: `JSON parse error: ${errorObj.message || "Unknown error"}`
            };
        }
    };

    const handleJsonChange = (value: string) => {
        setJsonInput(value);
        setError("");
        setParsedWorkflow(null);

        if (value.trim()) {
            const result = validateAndParseJSON(value);
            if (result.valid && result.data) {
                setParsedWorkflow(result.data);
            } else if (!result.valid && result.error) {
                setError(result.error);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            setError("Please upload a JSON file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            handleJsonChange(content);
        };
        reader.onerror = () => {
            setError("Failed to read file");
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // When importing JSON, use the workflow name from JSON
        const workflowName = parsedWorkflow?.name || name.trim();
        const workflowDescription = parsedWorkflow?.description || description.trim();

        if (!workflowName) {
            setError("Workflow name is required");
            return;
        }

        // Validate JSON if provided
        if (jsonInput.trim()) {
            const result = validateAndParseJSON(jsonInput);
            if (!result.valid) {
                setError(result.error || "Invalid JSON");
                return;
            }
        }

        setIsCreating(true);
        try {
            await onCreate(
                workflowName,
                workflowDescription || undefined,
                parsedWorkflow || undefined
            );

            // Reset form
            setName("");
            setDescription("");
            setJsonInput("");
            setParsedWorkflow(null);
            setShowJsonImport(false);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create workflow");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setName("");
            setDescription("");
            setJsonInput("");
            setParsedWorkflow(null);
            setError("");
            setShowJsonImport(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {showJsonImport ? "Import Workflow from JSON" : "Create New Workflow"}
                    </h2>
                    <Button variant="icon" onClick={handleClose} disabled={isCreating}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {error && <Alert variant="error">{error}</Alert>}

                    {/* Show name/description fields only when NOT in import mode */}
                    {!showJsonImport && (
                        <>
                            <div>
                                <label
                                    htmlFor="workflow-name"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Workflow Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="workflow-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Customer Onboarding Flow"
                                    required
                                    maxLength={255}
                                    disabled={isCreating}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="workflow-description"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Description (optional)
                                </label>
                                <Textarea
                                    id="workflow-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this workflow does..."
                                    rows={3}
                                    maxLength={1000}
                                    disabled={isCreating}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {description.length}/1000 characters
                                </p>
                            </div>

                            <div className="border-t border-border pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowJsonImport(true)}
                                    disabled={isCreating}
                                    className="gap-2"
                                >
                                    <FileJson className="w-4 h-4" />
                                    <span>Or import from JSON</span>
                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                </Button>
                            </div>
                        </>
                    )}

                    {/* JSON Import Section */}
                    {showJsonImport && (
                        <div>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setShowJsonImport(false);
                                    setJsonInput("");
                                    setParsedWorkflow(null);
                                    setError("");
                                }}
                                disabled={isCreating}
                                className="gap-2 mb-4"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                <span>Back to manual creation</span>
                            </Button>
                            <div className="mt-3 space-y-3">
                                {/* File Upload */}
                                <div>
                                    <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                        <Upload className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Upload JSON file
                                        </span>
                                        <Input
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileUpload}
                                            disabled={isCreating}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex-1 border-t border-border"></div>
                                    <span className="text-xs text-muted-foreground">OR</span>
                                    <div className="flex-1 border-t border-border"></div>
                                </div>

                                {/* JSON Input */}
                                <div>
                                    <label
                                        htmlFor="json-input"
                                        className="block text-xs font-medium text-muted-foreground mb-1.5"
                                    >
                                        Paste JSON Definition
                                    </label>
                                    <Textarea
                                        id="json-input"
                                        value={jsonInput}
                                        onChange={(e) => handleJsonChange(e.target.value)}
                                        placeholder={
                                            '{\n  "name": "My Workflow",\n  "nodes": {...},\n  "edges": [...],\n  "entryPoint": "..."\n}'
                                        }
                                        rows={6}
                                        disabled={isCreating}
                                        className="font-mono text-xs"
                                    />
                                    {parsedWorkflow && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    Valid
                                                </span>
                                                <span>
                                                    {Object.keys(parsedWorkflow.nodes || {}).length}{" "}
                                                    nodes
                                                </span>
                                                <span>
                                                    {(parsedWorkflow.edges || []).length} edges
                                                </span>
                                            </div>
                                            {parsedWorkflow.name && (
                                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                    <p className="text-sm font-medium text-foreground mb-1">
                                                        {parsedWorkflow.name}
                                                    </p>
                                                    {parsedWorkflow.description && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {parsedWorkflow.description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={
                                isCreating || (showJsonImport ? !parsedWorkflow : !name.trim())
                            }
                            loading={isCreating}
                        >
                            {isCreating
                                ? showJsonImport
                                    ? "Importing..."
                                    : "Creating..."
                                : showJsonImport
                                  ? "Import Workflow"
                                  : "Create Workflow"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
