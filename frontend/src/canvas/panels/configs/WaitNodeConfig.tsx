import { useState, useEffect } from "react";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface WaitNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const waitTypes = [
    { value: "duration", label: "Fixed Duration" },
    { value: "until", label: "Until Timestamp" },
    { value: "condition", label: "Until Condition" }
];

const timeUnits = [
    { value: "seconds", label: "Seconds" },
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" }
];

export function WaitNodeConfig({ data, onUpdate }: WaitNodeConfigProps) {
    const [waitType, setWaitType] = useState((data.waitType as string) || "duration");
    const [duration, setDuration] = useState((data.duration as number) || 5);
    const [unit, setUnit] = useState((data.unit as string) || "seconds");
    const [timestamp, setTimestamp] = useState((data.timestamp as string) || "");
    const [condition, setCondition] = useState((data.condition as string) || "");
    const [pollingInterval, setPollingInterval] = useState((data.pollingInterval as number) || 5);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            waitType,
            duration,
            unit,
            timestamp,
            condition,
            pollingInterval,
            outputVariable
        });
    }, [waitType, duration, unit, timestamp, condition, pollingInterval, outputVariable]);

    return (
        <div>
            <FormSection title="Wait Type">
                <FormField label="Type">
                    <Select value={waitType} onChange={setWaitType} options={waitTypes} />
                </FormField>
            </FormSection>

            {waitType === "duration" && (
                <FormSection title="Duration">
                    <FormField label="Wait For">
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                min={1}
                                max={365}
                                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <Select
                                value={unit}
                                onChange={setUnit}
                                options={timeUnits}
                                className="w-32"
                            />
                        </div>
                    </FormField>

                    <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                        The workflow will pause for{" "}
                        <strong>
                            {duration} {unit}
                        </strong>{" "}
                        before continuing.
                    </div>
                </FormSection>
            )}

            {waitType === "until" && (
                <FormSection title="Until Timestamp">
                    <FormField label="Timestamp" description="ISO 8601 format or use ${variable}">
                        <Input
                            type="text"
                            value={timestamp}
                            onChange={(e) => setTimestamp(e.target.value)}
                            placeholder="2024-12-31T23:59:59Z or ${scheduledTime}"
                            className="font-mono"
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Examples:</strong>
                            <br />• 2024-12-31T23:59:59Z
                            <br />• 2024-01-15T09:00:00-05:00
                            <br />• {"${futureTimestamp}"}
                        </p>
                    </div>
                </FormSection>
            )}

            {waitType === "condition" && (
                <FormSection title="Until Condition">
                    <FormField label="Condition" description="Wait until this evaluates to true">
                        <CodeInput
                            value={condition}
                            onChange={setCondition}
                            language="javascript"
                            placeholder="${status} === 'complete'"
                            rows={4}
                        />
                    </FormField>

                    <FormField
                        label="Polling Interval (seconds)"
                        description="How often to check the condition"
                    >
                        <Input
                            type="number"
                            value={pollingInterval}
                            onChange={(e) => setPollingInterval(parseInt(e.target.value) || 0)}
                            min={1}
                            max={3600}
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> Condition will be checked every {pollingInterval}{" "}
                            seconds until it evaluates to true.
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Wait"}
                    nodeType="wait"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
