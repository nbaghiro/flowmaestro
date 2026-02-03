import { ArrowLeft, X, Eye, EyeOff, Shield, Key, ExternalLink, FlaskConical } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import type { JsonObject, OAuthField, ApiKeySettings } from "@flowmaestro/shared";
import { useOAuth } from "../../../hooks/useOAuth";
import { validateApiKey, validateApiKeySoft } from "../../../lib/connectionValidation";
import { logger } from "../../../lib/logger";
import { useConnectionStore } from "../../../stores/connectionStore";
import { Alert } from "../../common/Alert";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Logo } from "../../common/Logo";
import { Select } from "../../common/Select";
import type { CreateConnectionInput } from "../../../lib/api";

interface NewConnectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string;
    providerDisplayName: string;
    providerIcon?: React.ReactNode;
    onSuccess?: () => void;
    supportsOAuth?: boolean;
    supportsApiKey?: boolean;
    /** OAuth pre-auth settings fields (e.g., subdomain for Zendesk) */
    oauthSettings?: OAuthField[];
    /** API key form customization (labels, secret field, help text) */
    apiKeySettings?: ApiKeySettings;
}

type DialogStep = "method-selection" | "oauth-settings-form" | "api-key-form" | "database-form";

/**
 * New Connection Dialog with StackAI-style design
 *
 * Displays two authentication options:
 * 1. OAuth2 - Opens popup for provider consent
 * 2. API Key - Shows form for manual credential entry
 */
export function NewConnectionDialog({
    isOpen,
    onClose,
    provider,
    providerDisplayName,
    providerIcon,
    onSuccess,
    supportsOAuth = true,
    supportsApiKey = true,
    oauthSettings,
    apiKeySettings
}: NewConnectionDialogProps) {
    const [step, setStep] = useState<DialogStep>("method-selection");
    const [connectionName, setConnectionName] = useState<string>(
        `${providerDisplayName} Connection`
    );
    const [apiKey, setApiKey] = useState<string>("");
    const [apiSecret, setApiSecret] = useState<string>("");
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [showApiSecret, setShowApiSecret] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [apiKeyValidationError, setApiKeyValidationError] = useState<string | null>(null);
    const [oauthInitiated, setOauthInitiated] = useState<boolean>(false);

    // OAuth pre-auth settings state (e.g., subdomain for Zendesk)
    const [oauthSettingsValues, setOauthSettingsValues] = useState<Record<string, string>>({});

    // Database connection state
    const [dbConnectionString, setDbConnectionString] = useState<string>("");
    const [dbHost, setDbHost] = useState<string>("localhost");
    const [dbPort, setDbPort] = useState<string>("5432");
    const [dbDatabase, setDbDatabase] = useState<string>("");
    const [dbUsername, setDbUsername] = useState<string>("");
    const [dbPassword, setDbPassword] = useState<string>("");
    const [dbSslEnabled, setDbSslEnabled] = useState<boolean>(false);
    const [showDbPassword, setShowDbPassword] = useState<boolean>(false);
    const [useConnectionString, setUseConnectionString] = useState<boolean>(false);

    const { initiateOAuth, loading: oauthLoading } = useOAuth();
    const { addConnection } = useConnectionStore();

    // Check if provider is a database
    const isDatabaseProvider = ["postgresql", "mysql", "mongodb"].includes(provider.toLowerCase());

    const handleReset = () => {
        setStep("method-selection");
        setConnectionName(`${providerDisplayName} Connection`);
        setApiKey("");
        setApiSecret("");
        setShowApiKey(false);
        setShowApiSecret(false);
        setError(null);
        setApiKeyValidationError(null);
        setIsSubmitting(false);
        setOauthInitiated(false);

        // Reset OAuth settings
        setOauthSettingsValues({});

        // Reset database fields
        setDbConnectionString("");
        setDbHost("localhost");
        setDbPort("5432");
        setDbDatabase("");
        setDbUsername("");
        setDbPassword("");
        setDbSslEnabled(false);
        setShowDbPassword(false);
        setUseConnectionString(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleOAuthSelect = useCallback(async () => {
        // If provider has OAuth settings, show the settings form first
        if (oauthSettings && oauthSettings.length > 0) {
            setStep("oauth-settings-form");
            return;
        }

        // No settings required, proceed directly with OAuth
        await performOAuthFlow();
    }, [oauthSettings]);

    /**
     * Perform the actual OAuth flow with optional settings
     */
    const performOAuthFlow = useCallback(
        async (settings?: Record<string, string>) => {
            // Prevent multiple simultaneous OAuth attempts
            if (oauthInitiated || oauthLoading) {
                logger.debug("OAuth already in progress, ignoring click");
                return;
            }

            logger.debug("OAuth button clicked", { provider });
            setOauthInitiated(true);
            setError(null);
            try {
                logger.debug("Initiating OAuth flow", { provider, settings });
                await initiateOAuth(provider, settings);
                logger.info("OAuth flow completed successfully", { provider });
                if (onSuccess) onSuccess();
                handleClose();
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "OAuth authentication failed";
                logger.error("OAuth error", err, { provider });
                // Only show error if it's not a popup-blocked error (user might have already completed it)
                if (!errorMessage.includes("popup") && !errorMessage.includes("Failed to open")) {
                    setError(errorMessage);
                }
                // Reset flag so user can try again
                setOauthInitiated(false);
            }
        },
        [initiateOAuth, provider, onSuccess, oauthInitiated, oauthLoading]
    );

    /**
     * Handle OAuth settings form submission
     */
    const handleOAuthSettingsSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);

            // Validate required fields
            if (oauthSettings) {
                for (const field of oauthSettings) {
                    const value = oauthSettingsValues[field.name] || "";

                    if (field.required && !value.trim()) {
                        setError(`${field.label} is required`);
                        return;
                    }

                    if (field.pattern && value) {
                        const regex = new RegExp(field.pattern);
                        if (!regex.test(value)) {
                            setError(field.patternError || `Invalid ${field.label}`);
                            return;
                        }
                    }
                }
            }

            // Proceed with OAuth using collected settings
            await performOAuthFlow(oauthSettingsValues);
        },
        [oauthSettings, oauthSettingsValues, performOAuthFlow]
    );

    /**
     * Update a single OAuth setting value
     */
    const updateOAuthSetting = useCallback((name: string, value: string) => {
        setOauthSettingsValues((prev) => ({ ...prev, [name]: value }));
    }, []);

    // Auto-select authentication method if only one is supported
    useEffect(() => {
        if (!isOpen) {
            setOauthInitiated(false);
            return;
        }

        if (oauthInitiated) return;

        // Database providers always go to database form
        if (isDatabaseProvider) {
            handleDatabaseSelect();
            return;
        }

        const methodCount = (supportsOAuth ? 1 : 0) + (supportsApiKey ? 1 : 0);

        // If only one method is supported, auto-select it (but don't auto-trigger OAuth)
        if (methodCount === 1) {
            if (supportsOAuth && !supportsApiKey) {
                // Show OAuth button (don't auto-trigger popup)
                setStep("method-selection");
            } else if (supportsApiKey && !supportsOAuth) {
                // Auto-show API Key form
                setStep("api-key-form");
            }
        } else {
            // Multiple methods supported, show selection
            setStep("method-selection");
        }

        return;
    }, [isOpen, supportsOAuth, supportsApiKey, oauthInitiated, isDatabaseProvider]);

    const handleApiKeySelect = () => {
        setStep("api-key-form");
    };

    const handleDatabaseSelect = () => {
        // Set default port based on provider
        if (provider === "postgresql") {
            setDbPort("5432");
        } else if (provider === "mysql") {
            setDbPort("3306");
        } else if (provider === "mongodb") {
            setDbPort("27017");
        }
        setStep("database-form");
    };

    const handleBackToMethodSelection = () => {
        setStep("method-selection");
        setError(null);
    };

    const handleApiKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connectionName.trim()) {
            setError("Connection name is required");
            return;
        }

        const keyLabel = apiKeySettings?.keyLabel || "API Key";
        if (!apiKey.trim()) {
            setError(`${keyLabel} is required`);
            return;
        }

        // Validate API key format
        const validation = validateApiKey(apiKey, provider);
        if (!validation.valid) {
            setError(validation.error || `Invalid ${providerDisplayName} key format`);
            return;
        }

        // Validate API secret if required
        if (apiKeySettings?.requiresSecret && !apiSecret.trim()) {
            const secretLabel = apiKeySettings?.secretLabel || "API Token";
            setError(`${secretLabel} is required`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const connectionData: Record<string, string> = {
                api_key: apiKey.trim()
            };

            // Include api_secret if provided
            if (apiSecret.trim()) {
                connectionData.api_secret = apiSecret.trim();
            }

            const input: CreateConnectionInput = {
                name: connectionName,
                connection_method: "api_key",
                provider,
                data: connectionData
            };

            await addConnection(input);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create connection");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDatabaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connectionName.trim()) {
            setError("Connection name is required");
            return;
        }

        // Validate based on connection method
        if (useConnectionString) {
            if (!dbConnectionString.trim()) {
                setError("Connection string is required");
                return;
            }
        } else {
            if (!dbHost.trim()) {
                setError("Host is required");
                return;
            }
            if (!dbDatabase.trim()) {
                setError("Database name is required");
                return;
            }
            if (!dbUsername.trim()) {
                setError("Username is required");
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const data: JsonObject = {
                ssl_enabled: dbSslEnabled
            };

            if (useConnectionString) {
                data.connection_string = dbConnectionString;
            } else {
                data.host = dbHost;
                data.port = parseInt(dbPort) || 5432;
                data.database = dbDatabase;
                data.username = dbUsername;
                data.password = dbPassword;
            }

            const input: CreateConnectionInput = {
                name: connectionName,
                connection_method: "api_key",
                provider,
                data
            };

            await addConnection(input);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create database connection");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestConnectionCreate = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const input: CreateConnectionInput = {
                name: `${providerDisplayName} Test Connection`,
                connection_method: "api_key",
                provider,
                data: {
                    api_key: `test-token-${provider}-${Date.now()}`
                },
                metadata: {
                    isTestConnection: true
                }
            };

            await addConnection(input);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create test connection");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 !m-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div className="relative bg-card border border-border/50 rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        {(step === "api-key-form" || step === "oauth-settings-form") && (
                            <Button variant="icon" onClick={handleBackToMethodSelection}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        {step === "database-form" && (
                            <Button
                                variant="icon"
                                onClick={handleClose}
                                title="Back to provider selection"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <h2 className="text-lg font-semibold text-foreground">New Connection</h2>
                    </div>
                    <Button variant="icon" onClick={handleClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Provider Connection Visual */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {/* FlowMaestro Icon */}
                        <Logo size="lg" />

                        {/* Dotted Line */}
                        <div className="flex-1 max-w-[120px] border-t-2 border-dotted border-border" />

                        {/* Provider Icon */}
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center shadow-md bg-card p-3">
                            {providerIcon}
                        </div>
                    </div>

                    {/* Connection Title */}
                    <p className="text-center text-foreground mb-6">
                        Connect FlowMaestro to {providerDisplayName}
                    </p>

                    {/* Method Selection */}
                    {step === "method-selection" && (
                        <div className="space-y-3">
                            {supportsOAuth && (
                                <button
                                    onClick={handleOAuthSelect}
                                    disabled={oauthLoading}
                                    className="w-full p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    type="button"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-foreground">
                                                    OAuth2 {providerDisplayName}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20 rounded">
                                                    OAUTH
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Link your account to FlowMaestro
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {supportsApiKey && (
                                <button
                                    onClick={handleApiKeySelect}
                                    className="w-full p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                                    type="button"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                            <Key className="w-5 h-5 text-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground mb-1">
                                                API Key
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Manually enter account credentials
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Test Connection Option - subtle link */}
                            <div className="pt-4 text-center">
                                <button
                                    onClick={handleTestConnectionCreate}
                                    disabled={isSubmitting}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                    type="button"
                                >
                                    <FlaskConical className="w-3 h-3" />
                                    <span>Or create a test connection with mock data</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* OAuth Settings Form (pre-auth settings like subdomain) */}
                    {step === "oauth-settings-form" && oauthSettings && (
                        <form onSubmit={handleOAuthSettingsSubmit} className="space-y-4">
                            <div className="mb-4">
                                <p className="text-sm text-muted-foreground">
                                    Please provide the following information to connect to{" "}
                                    {providerDisplayName}:
                                </p>
                            </div>

                            {oauthSettings.map((field) => (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {field.label}{" "}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.helpText && (
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {field.helpText}
                                        </p>
                                    )}
                                    {field.type === "text" && (
                                        <Input
                                            type="text"
                                            value={oauthSettingsValues[field.name] || ""}
                                            onChange={(e) =>
                                                updateOAuthSetting(field.name, e.target.value)
                                            }
                                            placeholder={field.placeholder}
                                            required={field.required}
                                        />
                                    )}
                                    {field.type === "select" && field.options && (
                                        <Select
                                            value={oauthSettingsValues[field.name] || ""}
                                            onChange={(val) => updateOAuthSetting(field.name, val)}
                                            options={[
                                                { value: "", label: "Select..." },
                                                ...(field.options?.map((option) => ({
                                                    value: option.value,
                                                    label: option.label
                                                })) || [])
                                            ]}
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Error Message */}
                            {error && <Alert variant="error">{error}</Alert>}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={oauthLoading || oauthInitiated}
                                >
                                    <Shield className="w-4 h-4" />
                                    {oauthLoading || oauthInitiated
                                        ? "Connecting..."
                                        : `Continue with ${providerDisplayName}`}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* API Key Form */}
                    {step === "api-key-form" && (
                        <form onSubmit={handleApiKeySubmit} className="space-y-4">
                            {/* Connection Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Connection Name <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Give your connection a friendly name to identify it in your
                                    workflows and settings
                                </p>
                                <Input
                                    type="text"
                                    value={connectionName}
                                    onChange={(e) => setConnectionName(e.target.value)}
                                    placeholder={`${providerDisplayName} (Personal Access Token) connection`}
                                    required
                                />
                            </div>

                            {/* API Key / Personal Access Token */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {apiKeySettings?.keyLabel || "Personal Access Token"}{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setApiKey(newValue);
                                            // Clear form error when user starts typing check for various error messages
                                            if (
                                                error &&
                                                (error.includes("key") ||
                                                    error.includes("token") ||
                                                    error.includes("required"))
                                            ) {
                                                setError(null);
                                            }
                                            const validation = validateApiKeySoft(
                                                newValue,
                                                provider
                                            );
                                            // Clear validation error if valid, otherwise set the error message
                                            setApiKeyValidationError(
                                                validation.valid ? null : validation.error || null
                                            );
                                        }}
                                        className="pr-10"
                                        placeholder={
                                            apiKeySettings?.keyPlaceholder ||
                                            "Enter your API key or token"
                                        }
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="icon"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2"
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* Provider-specific help text */}
                                {provider === "coda" && (
                                    <div className="mt-2 p-3 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 rounded-md">
                                        <p className="text-sm text-blue-700 dark:text-blue-400 dark:text-blue-300 font-medium mb-1">
                                            How to get your Coda API token:
                                        </p>
                                        <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                                            <li>
                                                Go to{" "}
                                                <a
                                                    href="https://coda.io/account"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline hover:text-blue-600"
                                                >
                                                    coda.io/account
                                                </a>
                                            </li>
                                            <li>Navigate to Account Settings → API Settings</li>
                                            <li>Click "Generate API token"</li>
                                            <li>Copy the token and paste it above</li>
                                        </ol>
                                    </div>
                                )}

                                {/* Real-time validation feedback */}
                                {apiKeyValidationError && (
                                    <div className="mt-2">
                                        <Alert variant="error">{apiKeyValidationError}</Alert>
                                    </div>
                                )}
                            </div>

                            {/* API Secret / Token (for providers that need both) */}
                            {apiKeySettings?.requiresSecret && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {apiKeySettings?.secretLabel || "API Token"}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showApiSecret ? "text" : "password"}
                                            value={apiSecret}
                                            onChange={(e) => {
                                                setApiSecret(e.target.value);
                                                // Clear form error when user starts typing
                                                if (
                                                    error &&
                                                    (error.includes("secret") ||
                                                        error.includes("token") ||
                                                        error.includes("required"))
                                                ) {
                                                    setError(null);
                                                }
                                            }}
                                            className="pr-10"
                                            placeholder={
                                                apiKeySettings?.secretPlaceholder ||
                                                "Enter your API token"
                                            }
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="icon"
                                            onClick={() => setShowApiSecret(!showApiSecret)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2"
                                        >
                                            {showApiSecret ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Help text and link */}
                            {apiKeySettings?.helpText && (
                                <div className="p-3 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 rounded-md">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {apiKeySettings.helpText}
                                        {apiKeySettings.helpUrl && (
                                            <>
                                                {" "}
                                                <a
                                                    href={apiKeySettings.helpUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 underline hover:text-blue-600 dark:hover:text-blue-200"
                                                >
                                                    Learn more
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && <Alert variant="error">{error}</Alert>}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSubmitting}
                                    loading={isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create connection"}
                                </Button>
                            </div>

                            {/* Test Connection Option - subtle link */}
                            <div className="pt-4 text-center border-t border-border mt-4">
                                <button
                                    onClick={handleTestConnectionCreate}
                                    disabled={isSubmitting}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                    type="button"
                                >
                                    <FlaskConical className="w-3 h-3" />
                                    <span>Or create a test connection with mock data</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Database Form */}
                    {step === "database-form" && (
                        <form onSubmit={handleDatabaseSubmit} className="space-y-4">
                            {/* Connection Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Connection Name <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Give your database connection a friendly name
                                </p>
                                <Input
                                    type="text"
                                    value={connectionName}
                                    onChange={(e) => setConnectionName(e.target.value)}
                                    placeholder={`${providerDisplayName} Connection`}
                                    required
                                />
                            </div>

                            {/* Connection Method Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Connection Method
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUseConnectionString(false)}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            !useConnectionString
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground hover:bg-muted/50"
                                        }`}
                                    >
                                        Individual Fields
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUseConnectionString(true)}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            useConnectionString
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground hover:bg-muted/50"
                                        }`}
                                    >
                                        Connection String
                                    </button>
                                </div>
                            </div>

                            {/* Connection String (if selected) */}
                            {useConnectionString ? (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Connection String <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Full database connection URL
                                    </p>
                                    <Input
                                        type="text"
                                        value={dbConnectionString}
                                        onChange={(e) => setDbConnectionString(e.target.value)}
                                        className="font-mono"
                                        placeholder={
                                            provider === "postgresql"
                                                ? "postgresql://user:password@localhost:5432/dbname"
                                                : provider === "mysql"
                                                  ? "mysql://user:password@localhost:3306/dbname"
                                                  : "mongodb://user:password@localhost:27017/dbname"
                                        }
                                        required
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Host and Port */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Host <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={dbHost}
                                                onChange={(e) => setDbHost(e.target.value)}
                                                placeholder="localhost"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Port <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={dbPort}
                                                onChange={(e) => setDbPort(e.target.value)}
                                                placeholder="5432"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Database Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Database Name <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={dbDatabase}
                                            onChange={(e) => setDbDatabase(e.target.value)}
                                            placeholder="my_database"
                                            required
                                        />
                                    </div>

                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Username <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={dbUsername}
                                            onChange={(e) => setDbUsername(e.target.value)}
                                            placeholder="db_user"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Password{" "}
                                            <span className="text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showDbPassword ? "text" : "password"}
                                                value={dbPassword}
                                                onChange={(e) => setDbPassword(e.target.value)}
                                                className="pr-10"
                                                placeholder="Enter database password"
                                            />
                                            <Button
                                                type="button"
                                                variant="icon"
                                                onClick={() => setShowDbPassword(!showDbPassword)}
                                                className="absolute right-1 top-1/2 -translate-y-1/2"
                                            >
                                                {showDbPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* SSL Enabled */}
                            <div className="flex items-center gap-2">
                                <Input
                                    type="checkbox"
                                    id="ssl-enabled"
                                    checked={dbSslEnabled}
                                    onChange={(e) => setDbSslEnabled(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="ssl-enabled"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Enable SSL/TLS
                                </label>
                            </div>

                            {/* Error Message */}
                            {error && <Alert variant="error">{error}</Alert>}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSubmitting}
                                    loading={isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create connection"}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Error Message for OAuth */}
                    {error && step === "method-selection" && (
                        <div className="mt-4">
                            <Alert variant="error">{error}</Alert>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
