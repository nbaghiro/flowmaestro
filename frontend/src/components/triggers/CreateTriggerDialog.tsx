/**
 * Create Trigger Dialog
 * Modal for creating new workflow triggers
 */

import { X, Calendar, Webhook, Play, FileUp } from "lucide-react";
import { useState } from "react";
import type { TriggerType, CreateTriggerInput } from "@flowmaestro/shared";
import { createTrigger } from "../../lib/api";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";

interface CreateTriggerDialogProps {
    workflowId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateTriggerDialog({ workflowId, onClose, onSuccess }: CreateTriggerDialogProps) {
    const [name, setName] = useState("");
    const [triggerType, setTriggerType] = useState<TriggerType>("schedule");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Schedule trigger fields
    const [cronExpression, setCronExpression] = useState("0 9 * * *");
    const [timezone, setTimezone] = useState("UTC");

    // Webhook trigger fields
    const [webhookMethod, setWebhookMethod] = useState<
        "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY"
    >("POST");
    const [authType, setAuthType] = useState<"none" | "hmac" | "bearer" | "api_key">("none");

    // Manual trigger fields
    const [manualInputs, setManualInputs] = useState<Array<{ key: string; value: string }>>([
        { key: "", value: "" }
    ]);
    const [manualDescription, setManualDescription] = useState("");

    // File trigger fields
    const [fileName, setFileName] = useState("");
    const [fileBase64, setFileBase64] = useState("");
    const [fileContentType, setFileContentType] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Please enter a trigger name");
            return;
        }

        setLoading(true);

        try {
            let config: unknown;
            if (triggerType === "schedule") {
                config = {
                    cronExpression,
                    timezone,
                    enabled: true
                };
            } else if (triggerType === "webhook") {
                config = {
                    method: webhookMethod,
                    authType,
                    responseFormat: "json"
                };
            } else if (triggerType === "manual") {
                // Convert inputs array to object, filtering out empty keys
                const inputsObject: Record<string, unknown> = {};
                manualInputs.forEach(({ key, value }) => {
                    if (key.trim()) {
                        // Try to parse value as JSON, otherwise use as string
                        try {
                            inputsObject[key.trim()] = JSON.parse(value);
                        } catch {
                            inputsObject[key.trim()] = value;
                        }
                    }
                });

                config = {
                    inputs: inputsObject,
                    description: manualDescription || undefined,
                    requireInputs: Object.keys(inputsObject).length > 0
                };
            } else if (triggerType === "file") {
                if (!fileBase64) {
                    setError("Please upload a file");
                    setLoading(false);
                    return;
                }
                config = {
                    fileName: fileName || undefined,
                    contentType: fileContentType || undefined,
                    base64: fileBase64
                };
            }

            const input: CreateTriggerInput = {
                workflowId,
                name: name.trim(),
                triggerType,
                enabled: true,
                config: config as Record<string, unknown>
            };

            await createTrigger(input);
            onSuccess();
        } catch (err) {
            console.error("Failed to create trigger:", err);
            setError(err instanceof Error ? err.message : "Failed to create trigger");
        } finally {
            setLoading(false);
        }
    };

    const cronExamples = [
        { label: "Every minute", value: "* * * * *" },
        { label: "Every hour", value: "0 * * * *" },
        { label: "Every day at 9 AM", value: "0 9 * * *" },
        { label: "Every Monday at 9 AM", value: "0 9 * * 1" },
        { label: "First day of month", value: "0 0 1 * *" }
    ];

    const handleFileSelect = (file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                const [prefix, data] = result.split(",", 2);
                setFileBase64(data || result);
                setFileContentType(
                    file.type || prefix?.split(";")?.[0]?.replace("data:", "") || ""
                );
                setFileName(file.name);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold">Create Trigger</h2>
                    <Button variant="icon" onClick={onClose} disabled={loading}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4 space-y-4">
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Trigger Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Trigger Name</label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Daily Report, Customer Webhook"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Trigger Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Trigger Type</label>
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTriggerType("manual")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "manual"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Play className="w-5 h-5 mx-auto mb-1 text-green-500" />
                                    <div className="text-sm font-medium">Manual</div>
                                    <div className="text-xs text-muted-foreground">
                                        Static inputs
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("schedule")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "schedule"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                                    <div className="text-sm font-medium">Schedule</div>
                                    <div className="text-xs text-muted-foreground">Cron-based</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("webhook")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "webhook"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Webhook className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                                    <div className="text-sm font-medium">Webhook</div>
                                    <div className="text-xs text-muted-foreground">
                                        HTTP endpoint
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("file")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "file"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <FileUp className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                                    <div className="text-sm font-medium">File</div>
                                    <div className="text-xs text-muted-foreground">Upload file</div>
                                </button>
                            </div>
                        </div>

                        {/* Manual Configuration */}
                        {triggerType === "manual" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Description (optional)
                                    </label>
                                    <Input
                                        type="text"
                                        value={manualDescription}
                                        onChange={(e) => setManualDescription(e.target.value)}
                                        placeholder="e.g., Test with sample data"
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Static Inputs
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Define key-value pairs for workflow inputs. Values can be
                                        strings or JSON.
                                    </p>
                                    <div className="space-y-2">
                                        {manualInputs.map((input, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    value={input.key}
                                                    onChange={(e) => {
                                                        const newInputs = [...manualInputs];
                                                        newInputs[index].key = e.target.value;
                                                        setManualInputs(newInputs);
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="key"
                                                    disabled={loading}
                                                />
                                                <Input
                                                    type="text"
                                                    value={input.value}
                                                    onChange={(e) => {
                                                        const newInputs = [...manualInputs];
                                                        newInputs[index].value = e.target.value;
                                                        setManualInputs(newInputs);
                                                    }}
                                                    className="flex-[2] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="value"
                                                    disabled={loading}
                                                />
                                                {manualInputs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newInputs = manualInputs.filter(
                                                                (_, i) => i !== index
                                                            );
                                                            setManualInputs(newInputs);
                                                        }}
                                                        className="px-3 py-2 border border-border rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                                        disabled={loading}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setManualInputs([
                                                ...manualInputs,
                                                { key: "", value: "" }
                                            ])
                                        }
                                        className="mt-2 text-sm text-primary hover:underline"
                                        disabled={loading}
                                    >
                                        + Add Input
                                    </button>
                                </div>
                            </>
                        )}

                        {/* File Configuration */}
                        {triggerType === "file" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Upload File
                                    </label>
                                    <Input
                                        type="file"
                                        accept="*/*"
                                        onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                        disabled={loading}
                                    />
                                    {fileName && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Selected: {fileName}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            File Name (optional)
                                        </label>
                                        <Input
                                            type="text"
                                            value={fileName}
                                            onChange={(e) => setFileName(e.target.value)}
                                            placeholder="invoice.pdf"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            Content Type (optional)
                                        </label>
                                        <Input
                                            type="text"
                                            value={fileContentType}
                                            onChange={(e) => setFileContentType(e.target.value)}
                                            placeholder="application/pdf"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Base64 (optional override)
                                    </label>
                                    <Input
                                        type="text"
                                        value={fileBase64}
                                        onChange={(e) => setFileBase64(e.target.value)}
                                        placeholder="Paste base64 content"
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        If provided, this overrides the uploaded file.
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Schedule Configuration */}
                        {triggerType === "schedule" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Cron Expression
                                    </label>
                                    <Input
                                        type="text"
                                        value={cronExpression}
                                        onChange={(e) => setCronExpression(e.target.value)}
                                        className="font-mono"
                                        placeholder="0 9 * * *"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Format: minute hour day month weekday
                                    </p>
                                </div>

                                {/* Quick Examples */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Quick Examples
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cronExamples.map((example) => (
                                            <button
                                                key={example.value}
                                                type="button"
                                                onClick={() => setCronExpression(example.value)}
                                                className="px-3 py-2 text-xs border border-border rounded hover:bg-muted transition-colors text-left"
                                                disabled={loading}
                                            >
                                                <div className="font-medium">{example.label}</div>
                                                <code className="text-muted-foreground">
                                                    {example.value}
                                                </code>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Timezone
                                    </label>
                                    <Input
                                        type="text"
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        placeholder="UTC"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        e.g., UTC, America/New_York, Europe/London
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Webhook Configuration */}
                        {triggerType === "webhook" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        HTTP Method
                                    </label>
                                    <Select
                                        value={webhookMethod}
                                        onChange={(value) =>
                                            setWebhookMethod(
                                                value as
                                                    | "GET"
                                                    | "POST"
                                                    | "PUT"
                                                    | "DELETE"
                                                    | "PATCH"
                                                    | "ANY"
                                            )
                                        }
                                        disabled={loading}
                                        options={[
                                            { value: "POST", label: "POST" },
                                            { value: "GET", label: "GET" },
                                            { value: "PUT", label: "PUT" },
                                            { value: "DELETE", label: "DELETE" },
                                            { value: "PATCH", label: "PATCH" },
                                            { value: "ANY", label: "ANY (all methods)" }
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Authentication
                                    </label>
                                    <Select
                                        value={authType}
                                        onChange={(value) =>
                                            setAuthType(
                                                value as "none" | "hmac" | "bearer" | "api_key"
                                            )
                                        }
                                        disabled={loading}
                                        options={[
                                            { value: "none", label: "None" },
                                            { value: "hmac", label: "HMAC Signature" },
                                            { value: "bearer", label: "Bearer Token" },
                                            { value: "api_key", label: "API Key" }
                                        ]}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        A unique webhook URL and secret will be generated after
                                        creation
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex gap-3 flex-shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            loading={loading}
                            className="flex-1"
                        >
                            {loading ? "Creating..." : "Create Trigger"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
