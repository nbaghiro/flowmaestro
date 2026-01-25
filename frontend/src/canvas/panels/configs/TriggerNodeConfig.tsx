/**
 * Trigger Node Configuration Panel
 * Shows integration providers with webhook triggers
 */

import { ChevronLeft, Zap } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { getProviderLogo, type ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { TriggerEventList } from "../../../components/triggers/TriggerEventList";
import { TriggerProviderList } from "../../../components/triggers/TriggerProviderList";
import { cn } from "../../../lib/utils";
import type { TriggerProviderSummary, TriggerEvent, TriggerConfigField } from "../../../lib/api";

export interface TriggerNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

// View states for the multi-step flow
type ViewState = "provider-list" | "event-list" | "event-config";

export function TriggerNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors: _errors
}: TriggerNodeConfigProps) {
    // Use ref to avoid infinite update loops when onUpdate changes
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const isInitialMount = useRef(true);

    // Provider trigger state
    const [selectedProvider, setSelectedProvider] = useState<TriggerProviderSummary | null>(
        data.providerId
            ? ({
                  providerId: data.providerId as string,
                  name: (data.providerName as string) || (data.providerId as string),
                  description: "",
                  icon: "",
                  category: "",
                  eventCount: 0,
                  requiresConnection: true,
                  webhookSetupType: "automatic" as const
              } as TriggerProviderSummary)
            : null
    );
    const [selectedEvent, setSelectedEvent] = useState<TriggerEvent | null>(
        data.eventId
            ? ({
                  id: data.eventId as string,
                  name: (data.eventName as string) || (data.eventId as string),
                  description: "",
                  configFields: (data.eventConfigFields as TriggerConfigField[]) || []
              } as TriggerEvent)
            : null
    );
    const [eventConfig, setEventConfig] = useState<Record<string, unknown>>(
        (data.eventConfig as Record<string, unknown>) || {}
    );

    // Multi-step view state
    const [viewState, setViewState] = useState<ViewState>(() => {
        if (selectedEvent) return "event-config";
        if (selectedProvider) return "event-list";
        return "provider-list";
    });

    // Build and send config to parent
    const updateConfig = useCallback(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const config: Record<string, unknown> = {
            triggerType: "provider"
        };

        if (selectedProvider && selectedEvent) {
            config.providerId = selectedProvider.providerId;
            config.providerName = selectedProvider.name;
            config.eventId = selectedEvent.id;
            config.eventName = selectedEvent.name;
            config.eventConfig = eventConfig;
            config.eventConfigFields = selectedEvent.configFields;
            // For display purposes - include provider name in label
            config.label = `${selectedProvider.name} ${selectedEvent.name}`;
        }

        onUpdateRef.current(config);
    }, [selectedProvider, selectedEvent, eventConfig]);

    useEffect(() => {
        updateConfig();
    }, [updateConfig]);

    const handleSelectProvider = (provider: TriggerProviderSummary) => {
        setSelectedProvider(provider);
        setSelectedEvent(null);
        setEventConfig({});
        setViewState("event-list");
    };

    const handleSelectEvent = (event: TriggerEvent) => {
        setSelectedEvent(event);
        // Initialize event config with default values
        const initialConfig: Record<string, unknown> = {};
        if (event.configFields) {
            for (const field of event.configFields) {
                if (field.defaultValue !== undefined) {
                    initialConfig[field.name] = field.defaultValue;
                }
            }
        }
        setEventConfig(initialConfig);
        setViewState("event-config");
    };

    const handleBackToProviders = () => {
        setSelectedProvider(null);
        setSelectedEvent(null);
        setEventConfig({});
        setViewState("provider-list");
    };

    const handleBackToEvents = () => {
        setSelectedEvent(null);
        setEventConfig({});
        setViewState("event-list");
    };

    const handleEventConfigChange = (fieldName: string, value: unknown) => {
        setEventConfig((prev) => ({ ...prev, [fieldName]: value }));
    };

    // Render provider selection
    if (viewState === "provider-list") {
        return (
            <FormSection title="Select Integration">
                <p className="text-sm text-muted-foreground mb-3">
                    Please select an integration for your trigger.
                </p>
                <TriggerProviderList onSelectProvider={handleSelectProvider} />
            </FormSection>
        );
    }

    // Render event selection
    if (viewState === "event-list" && selectedProvider) {
        return (
            <FormSection title="Select Trigger">
                <TriggerEventList
                    provider={selectedProvider}
                    onSelectEvent={handleSelectEvent}
                    onBack={handleBackToProviders}
                />
            </FormSection>
        );
    }

    // Render event configuration
    if (viewState === "event-config" && selectedProvider && selectedEvent) {
        return (
            <ProviderEventConfig
                provider={selectedProvider}
                event={selectedEvent}
                eventConfig={eventConfig}
                onEventConfigChange={handleEventConfigChange}
                onBackToEvents={handleBackToEvents}
                onBackToProviders={handleBackToProviders}
            />
        );
    }

    // Fallback - should not reach here
    return (
        <FormSection title="Select Integration">
            <p className="text-sm text-muted-foreground mb-3">
                Please select an integration for your trigger.
            </p>
            <TriggerProviderList onSelectProvider={handleSelectProvider} />
        </FormSection>
    );
}

// Provider Event Configuration Component
interface ProviderEventConfigProps {
    nodeId?: string;
    provider: TriggerProviderSummary;
    event: TriggerEvent;
    eventConfig: Record<string, unknown>;
    onEventConfigChange: (fieldName: string, value: unknown) => void;
    onBackToEvents: () => void;
    onBackToProviders: () => void;
}

function ProviderEventConfig({
    provider,
    event,
    eventConfig,
    onEventConfigChange,
    onBackToEvents,
    onBackToProviders
}: ProviderEventConfigProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <FormSection title="Trigger Configuration">
            {/* Header with provider/event info */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {imageError ? (
                            <Zap className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <img
                                src={getProviderLogo(provider.providerId)}
                                alt={provider.name}
                                className="w-6 h-6 object-contain"
                                onError={() => setImageError(true)}
                            />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-sm">{event.name}</h3>
                        <p className="text-xs text-muted-foreground">{provider.name}</p>
                    </div>
                </div>
                {event.description && (
                    <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
                )}

                {/* Navigation */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={onBackToEvents}
                        className={cn(
                            "text-xs px-2 py-1 rounded",
                            "bg-muted hover:bg-muted/80 transition-colors",
                            "flex items-center gap-1"
                        )}
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Change trigger
                    </button>
                    <button
                        onClick={onBackToProviders}
                        className={cn(
                            "text-xs px-2 py-1 rounded",
                            "bg-muted hover:bg-muted/80 transition-colors",
                            "flex items-center gap-1"
                        )}
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Change provider
                    </button>
                </div>
            </div>

            {/* Event-specific Configuration Fields */}
            {event.configFields && event.configFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Configuration
                    </h4>
                    {event.configFields.map((field) => (
                        <EventConfigField
                            key={field.name}
                            field={field}
                            value={eventConfig[field.name]}
                            onChange={(value) => onEventConfigChange(field.name, value)}
                        />
                    ))}
                </div>
            )}

            {/* Connection requirement notice */}
            {provider.requiresConnection && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        This trigger requires a connection to {provider.name}. You&apos;ll need to
                        connect your account in the Connections page.
                    </p>
                </div>
            )}

            {/* Webhook setup info */}
            {provider.webhookSetupType === "manual" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        After saving, you&apos;ll receive a webhook URL to configure in{" "}
                        {provider.name}.
                    </p>
                </div>
            )}

            {provider.webhookSetupType === "polling" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        This trigger uses polling to check for changes every few minutes.
                    </p>
                </div>
            )}
        </FormSection>
    );
}

// Event Config Field Component
interface EventConfigFieldProps {
    nodeId?: string;
    field: TriggerConfigField;
    value: unknown;
    onChange: (value: unknown) => void;
}

function EventConfigField({ field, value, onChange }: EventConfigFieldProps) {
    const renderField = () => {
        switch (field.type) {
            case "text":
                return (
                    <Input
                        type="text"
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                    />
                );

            case "number":
                return (
                    <Input
                        type="number"
                        value={(value as number) || ""}
                        onChange={(e) => onChange(Number(e.target.value))}
                        placeholder={field.placeholder}
                    />
                );

            case "boolean":
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={(value as boolean) || false}
                            onChange={(e) => onChange(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">{field.description || "Enabled"}</span>
                    </label>
                );

            case "select":
                if (field.dynamicOptions) {
                    return (
                        <Input
                            type="text"
                            value={(value as string) || ""}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                    );
                }
                return (
                    <Select
                        value={(value as string) || ""}
                        onChange={onChange}
                        options={
                            field.options?.map((opt) => ({
                                value: opt.value,
                                label: opt.label
                            })) || []
                        }
                    />
                );

            case "multiselect":
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt) => {
                            const selectedValues = (value as string[]) || [];
                            const isChecked = selectedValues.includes(opt.value);
                            return (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                onChange([...selectedValues, opt.value]);
                                            } else {
                                                onChange(
                                                    selectedValues.filter((v) => v !== opt.value)
                                                );
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            );
                        })}
                    </div>
                );

            case "json":
                return (
                    <Textarea
                        value={
                            typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)
                        }
                        onChange={(e) => {
                            try {
                                onChange(JSON.parse(e.target.value));
                            } catch {
                                onChange(e.target.value);
                            }
                        }}
                        placeholder={field.placeholder || "{}"}
                        rows={4}
                        className="font-mono text-xs"
                    />
                );

            default:
                return (
                    <Input
                        type="text"
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                    />
                );
        }
    };

    const labelWithRequired = field.required ? `${field.label} *` : field.label;

    return (
        <FormField
            label={labelWithRequired}
            description={field.type !== "boolean" ? field.description : undefined}
        >
            {renderField()}
        </FormField>
    );
}
