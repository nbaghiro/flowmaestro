import React, { useState } from "react";
import { ConnectionMethod, CreateConnectionInput } from "../../lib/api";
import { useConnectionStore } from "../../stores/connectionStore";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";

interface AddConnectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialProvider?: string;
}

type Step = "method" | "provider" | "configure";

const providersByMethod: Record<ConnectionMethod, string[]> = {
    api_key: ["openai", "anthropic", "google", "github", "cohere", "custom"],
    oauth2: ["slack", "google", "notion", "airtable", "hubspot", "github"],
    basic_auth: ["custom"],
    custom: ["custom"]
};

const providerLabels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    cohere: "Cohere",
    slack: "Slack",
    github: "GitHub",
    notion: "Notion",
    airtable: "Airtable",
    hubspot: "HubSpot",
    custom: "Custom"
};

export function AddConnectionDialog({
    isOpen,
    onClose,
    onSuccess,
    initialProvider
}: AddConnectionDialogProps) {
    const [step, setStep] = useState<Step>("method");
    const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod | null>(null);
    const [provider, setProvider] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [config, setConfig] = useState<Record<string, unknown>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addConnection } = useConnectionStore();

    // When dialog opens with initialProvider, auto-select it
    React.useEffect(() => {
        if (isOpen && initialProvider) {
            setProvider(initialProvider);
            // Skip to method selection step
            setStep("method");
        }
    }, [isOpen, initialProvider]);

    const handleReset = () => {
        setStep("method");
        setConnectionMethod(null);
        setProvider("");
        setName("");
        setConfig({});
        setError(null);
        setSaving(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleMethodSelect = (method: ConnectionMethod) => {
        setConnectionMethod(method);
        setStep("provider");
    };

    const handleProviderSelect = (selectedProvider: string) => {
        setProvider(selectedProvider);
        setName(`${providerLabels[selectedProvider]} Connection`);
        setStep("configure");
    };

    const buildConnectionInput = (): CreateConnectionInput => {
        if (!connectionMethod || !provider) {
            throw new Error("Method and provider required");
        }

        const input: CreateConnectionInput = {
            name,
            connection_method: connectionMethod,
            provider,
            data: {}
        };

        // Build data based on connection method
        if (connectionMethod === "api_key") {
            const data: Record<string, string> = {
                api_key: (config.apiKey as string) || ""
            };
            if (config.apiSecret) {
                data.api_secret = config.apiSecret as string;
            }
            input.data = data as import("@flowmaestro/shared").JsonObject;
        } else if (connectionMethod === "basic_auth") {
            input.data = {
                username: (config.username as string) || "",
                password: (config.password as string) || ""
            } as import("@flowmaestro/shared").JsonObject;
        }

        return input;
    };

    const handleSave = async () => {
        if (!connectionMethod || !provider) return;

        setSaving(true);
        setError(null);

        try {
            const input = buildConnectionInput();
            await addConnection(input);

            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save connection");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Connection"
            description={
                step === "method"
                    ? "Choose how you want to connect"
                    : step === "provider"
                      ? "Select a provider"
                      : `Configure ${providerLabels[provider] || "connection"}`
            }
            maxWidth="lg"
        >
            {/* Step 1: Select Method */}
            {step === "method" && (
                <div className="space-y-3">
                    <MethodOption
                        title="API Key"
                        description="Connect using an API key or secret"
                        icon="🔑"
                        onClick={() => handleMethodSelect("api_key")}
                    />
                    <MethodOption
                        title="OAuth"
                        description="Connect with OAuth 2.0 authorization"
                        icon="🔐"
                        onClick={() => handleMethodSelect("oauth2")}
                    />
                </div>
            )}

            {/* Step 2: Select Provider */}
            {step === "provider" && connectionMethod && (
                <div>
                    <button
                        onClick={() => setStep("method")}
                        className="text-sm text-blue-600 hover:underline mb-4"
                    >
                        ← Back to method selection
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        {providersByMethod[connectionMethod].map((p) => (
                            <button
                                key={p}
                                onClick={() => handleProviderSelect(p)}
                                className="p-4 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                                <div className="font-medium text-gray-900">{providerLabels[p]}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Configure */}
            {step === "configure" && connectionMethod && (
                <div>
                    <button
                        onClick={() => setStep("provider")}
                        className="text-sm text-blue-600 hover:underline mb-4"
                    >
                        ← Back to provider selection
                    </button>

                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Connection Name
                            </label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Connection"
                            />
                        </div>

                        {/* API Key Configuration */}
                        {connectionMethod === "api_key" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        API Key
                                    </label>
                                    <Input
                                        type="password"
                                        value={(config.apiKey as string) || ""}
                                        onChange={(e) =>
                                            setConfig({ ...config, apiKey: e.target.value })
                                        }
                                        placeholder="sk-..."
                                    />
                                </div>
                                {(provider === "openai" || provider === "custom") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            API Secret (Optional)
                                        </label>
                                        <Input
                                            type="password"
                                            value={(config.apiSecret as string) || ""}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    apiSecret: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* OAuth Message */}
                        {connectionMethod === "oauth2" && (
                            <div className="p-4 bg-blue-50 rounded-md">
                                <p className="text-sm text-blue-800">
                                    OAuth connections are configured through the Integrations page.
                                    Click "Connect" on the provider you want to authorize.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Actions */}
                        {connectionMethod !== "oauth2" && (
                            <div className="flex justify-end pt-4">
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={saving || !name}
                                    loading={saving}
                                >
                                    {saving ? "Saving..." : "Save Connection"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Dialog>
    );
}

interface MethodOptionProps {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
}

function MethodOption({ title, description, icon, onClick }: MethodOptionProps) {
    return (
        <button
            onClick={onClick}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">{icon}</div>
                <div>
                    <div className="font-medium text-gray-900">{title}</div>
                    <div className="text-sm text-gray-600">{description}</div>
                </div>
            </div>
        </button>
    );
}
