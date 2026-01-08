import {
    Upload,
    FileJson,
    ChevronRight,
    ChevronLeft,
    ArrowRight,
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2,
    type LucideIcon
} from "lucide-react";
import { useState, FormEvent, useMemo } from "react";
import { getAdvancedPatterns } from "../lib/advancedWorkflowPatterns";
import { cn } from "../lib/utils";
import { getAllPatterns, type WorkflowPattern } from "../lib/workflowPatterns";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Dialog } from "./common/Dialog";
import { Input } from "./common/Input";
import { Textarea } from "./common/Textarea";
import { PatternPicker } from "./PatternPicker";
import type { WorkflowDefinition } from "../lib/api";

// Icon mapping for patterns (same as PatternPicker)
const iconMap: Record<string, LucideIcon> = {
    MessageSquare,
    Link,
    GitBranch,
    RefreshCw,
    Search,
    CheckCircle,
    Layers,
    UserCheck,
    Shield,
    ListTodo,
    Plus,
    Mail,
    Bug,
    Share2
};

interface CreateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (
        name: string,
        description?: string,
        definition?: WorkflowDefinition
    ) => Promise<void>;
}

type DialogStep = "pattern" | "details" | "json-import";

export function CreateWorkflowDialog({ isOpen, onClose, onCreate }: CreateWorkflowDialogProps) {
    // Step state
    const [step, setStep] = useState<DialogStep>("pattern");

    // Tab state for pattern selection
    const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");

    // Get patterns for each tab
    const basicPatterns = useMemo(() => getAllPatterns(), []);
    const advancedPatterns = useMemo(() => getAdvancedPatterns(), []);

    // Pattern selection state
    const [selectedPattern, setSelectedPattern] = useState<WorkflowPattern | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // JSON import state
    const [jsonInput, setJsonInput] = useState("");
    const [parsedWorkflow, setParsedWorkflow] = useState<WorkflowDefinition | null>(null);

    // UI state
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

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

    const handlePatternSelect = (pattern: WorkflowPattern) => {
        setSelectedPattern(pattern);
        setError("");
    };

    const handlePatternNext = () => {
        if (selectedPattern) {
            // Pre-fill name and description from pattern
            setName(selectedPattern.name);
            setDescription(selectedPattern.description);
            setStep("details");
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // Determine workflow name and definition based on step
        let workflowName: string;
        let workflowDescription: string | undefined;
        let workflowDefinition: WorkflowDefinition | undefined;

        if (step === "json-import") {
            // JSON import mode
            workflowName = parsedWorkflow?.name || name.trim();
            workflowDescription = parsedWorkflow?.description || description.trim() || undefined;

            if (!workflowName) {
                setError("Workflow name is required");
                return;
            }

            if (jsonInput.trim()) {
                const result = validateAndParseJSON(jsonInput);
                if (!result.valid) {
                    setError(result.error || "Invalid JSON");
                    return;
                }
                workflowDefinition = parsedWorkflow || undefined;
            }
        } else {
            // Pattern-based creation
            workflowName = name.trim();
            workflowDescription = description.trim() || undefined;

            if (!workflowName) {
                setError("Workflow name is required");
                return;
            }

            if (selectedPattern) {
                // Clone the definition and update the name
                workflowDefinition = {
                    ...selectedPattern.definition,
                    name: workflowName
                };
            }
        }

        setIsCreating(true);
        try {
            await onCreate(workflowName, workflowDescription, workflowDefinition);

            // Reset form
            resetForm();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create workflow");
        } finally {
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setStep("pattern");
        setActiveTab("basic");
        setSelectedPattern(null);
        setName("");
        setDescription("");
        setJsonInput("");
        setParsedWorkflow(null);
        setError("");
    };

    const handleClose = () => {
        if (!isCreating) {
            resetForm();
            onClose();
        }
    };

    const handleBack = () => {
        if (step === "details") {
            setStep("pattern");
            setError("");
        } else if (step === "json-import") {
            setStep("details");
            setJsonInput("");
            setParsedWorkflow(null);
            setError("");
        }
    };

    // Determine dialog title based on step
    const getDialogTitle = () => {
        switch (step) {
            case "pattern":
                return "Create New Workflow";
            case "details":
                return "Name Your Workflow";
            case "json-import":
                return "Import Workflow from JSON";
            default:
                return "Create New Workflow";
        }
    };

    // Determine dialog size based on step
    const getDialogSize = () => {
        return step === "pattern" ? "6xl" : "md";
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={getDialogTitle()}
            size={getDialogSize()}
            closeOnBackdropClick={!isCreating}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Step 1: Pattern Selection */}
                {step === "pattern" && (
                    <div className="flex flex-col">
                        {/* Compact header with tabs and description inline */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                    Select a starting template:
                                </span>
                                <div className="flex bg-gray-200 dark:bg-muted rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("basic")}
                                        className={cn(
                                            "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                                            activeTab === "basic"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Basic
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("advanced")}
                                        className={cn(
                                            "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                                            activeTab === "advanced"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Advanced
                                    </button>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {activeTab === "basic"
                                    ? basicPatterns.length
                                    : advancedPatterns.length}{" "}
                                templates
                            </span>
                        </div>

                        {/* Scrollable grid area */}
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <PatternPicker
                                patterns={activeTab === "basic" ? basicPatterns : advancedPatterns}
                                selectedPatternId={selectedPattern?.id || null}
                                onSelect={handlePatternSelect}
                            />
                        </div>

                        {/* Actions - always visible */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border bg-card">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClose}
                                disabled={isCreating}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handlePatternNext}
                                disabled={!selectedPattern}
                                className="gap-2"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Name & Description */}
                {step === "details" && (
                    <>
                        {/* Selected pattern indicator */}
                        {selectedPattern &&
                            (() => {
                                const PatternIcon = iconMap[selectedPattern.icon] || Plus;
                                return (
                                    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <PatternIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {selectedPattern.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedPattern.nodeCount} nodes
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

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
                                onClick={() => setStep("json-import")}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <FileJson className="w-4 h-4" />
                                <span>Or import from JSON</span>
                                <ChevronRight className="w-4 h-4 ml-auto" />
                            </Button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
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
                                    disabled={isCreating || !name.trim()}
                                    loading={isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create Workflow"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: JSON Import */}
                {step === "json-import" && (
                    <>
                        <div className="space-y-3">
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
                                            <span>{(parsedWorkflow.edges || []).length} edges</span>
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

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                disabled={isCreating}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
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
                                    disabled={isCreating || !parsedWorkflow}
                                    loading={isCreating}
                                >
                                    {isCreating ? "Importing..." : "Import Workflow"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}
