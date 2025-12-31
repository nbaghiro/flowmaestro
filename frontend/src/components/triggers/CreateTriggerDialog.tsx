/**
 * Create Trigger Dialog
 * Modal for creating new workflow triggers
 */

import { X, Calendar, Webhook, Play } from "lucide-react";
import { useState } from "react";
import type { TriggerType, CreateTriggerInput } from "@flowmaestro/shared";
import { createTrigger } from "../../lib/api";
import { logger } from "../../lib/logger";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Select } from "../common/Select";

interface CreateTriggerDialogProps {
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateTriggerDialog({
    workflowId,
    isOpen,
    onClose,
    onSuccess
}: CreateTriggerDialogProps) {
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
            logger.error("Failed to create trigger", err);
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

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Create Trigger"
            size="lg"
            closeOnBackdropClick={!loading}
            footer={
                <div className="flex gap-3">
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
                        form="trigger-form"
                        variant="primary"
                        disabled={loading}
                        loading={loading}
                        className="flex-1"
                    >
                        {loading ? "Creating..." : "Create Trigger"}
                    </Button>
                </div>
            }
        >
            <form id="trigger-form" onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Trigger Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Trigger Name
                    </label>
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
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Trigger Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setTriggerType("manual")}
                            className={`p-3 border rounded-lg transition-all ${
                                triggerType === "manual"
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                    : "border-border hover:bg-accent"
                            }`}
                            disabled={loading}
                        >
                            <Play className="w-5 h-5 mx-auto mb-1 text-green-500" />
                            <div className="text-sm font-medium text-foreground">Manual</div>
                            <div className="text-xs text-muted-foreground">Static inputs</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTriggerType("schedule")}
                            className={`p-3 border rounded-lg transition-all ${
                                triggerType === "schedule"
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                    : "border-border hover:bg-accent"
                            }`}
                            disabled={loading}
                        >
                            <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                            <div className="text-sm font-medium text-foreground">Schedule</div>
                            <div className="text-xs text-muted-foreground">Cron-based</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTriggerType("webhook")}
                            className={`p-3 border rounded-lg transition-all ${
                                triggerType === "webhook"
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                    : "border-border hover:bg-accent"
                            }`}
                            disabled={loading}
                        >
                            <Webhook className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                            <div className="text-sm font-medium text-foreground">Webhook</div>
                            <div className="text-xs text-muted-foreground">HTTP endpoint</div>
                        </button>
                    </div>
                </div>

                {/* Manual Configuration */}
                {triggerType === "manual" && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
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
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Static Inputs
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Define key-value pairs for workflow inputs. Values can be strings or
                                JSON.
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
                                            className="flex-1"
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
                                            className="flex-[2]"
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
                                    setManualInputs([...manualInputs, { key: "", value: "" }])
                                }
                                className="mt-2 text-sm text-primary hover:underline"
                                disabled={loading}
                            >
                                + Add Input
                            </button>
                        </div>
                    </>
                )}

                {/* Schedule Configuration */}
                {triggerType === "schedule" && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
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
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Quick Examples
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {cronExamples.map((example) => (
                                    <button
                                        key={example.value}
                                        type="button"
                                        onClick={() => setCronExpression(example.value)}
                                        className="px-3 py-2 text-xs border border-border rounded hover:bg-accent transition-colors text-left"
                                        disabled={loading}
                                    >
                                        <div className="font-medium text-foreground">
                                            {example.label}
                                        </div>
                                        <code className="text-muted-foreground">
                                            {example.value}
                                        </code>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
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
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                HTTP Method
                            </label>
                            <Select
                                value={webhookMethod}
                                onChange={(value) =>
                                    setWebhookMethod(
                                        value as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY"
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
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Authentication
                            </label>
                            <Select
                                value={authType}
                                onChange={(value) =>
                                    setAuthType(value as "none" | "hmac" | "bearer" | "api_key")
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
                                A unique webhook URL and secret will be generated after creation
                            </p>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}
