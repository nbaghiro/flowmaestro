import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Slider } from "../../../components/common/Slider";
import { Textarea } from "../../../components/common/Textarea";

interface VoiceMenuNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

interface MenuOption {
    key: string;
    label: string;
    value?: string;
    description?: string;
}

const inputMethods = [
    { value: "both", label: "Voice or DTMF (Recommended)" },
    { value: "voice", label: "Voice Only" },
    { value: "dtmf", label: "DTMF (Keypad) Only" }
];

export function VoiceMenuNodeConfig({ data, onUpdate }: VoiceMenuNodeConfigProps) {
    const [prompt, setPrompt] = useState((data.prompt as string) || "Please select an option");
    const [options, setOptions] = useState<MenuOption[]>(
        (data.options as MenuOption[]) || [
            { key: "1", label: "Option 1", value: "option1" },
            { key: "2", label: "Option 2", value: "option2" }
        ]
    );
    const [inputMethod, setInputMethod] = useState((data.inputMethod as string) || "both");
    const [timeoutSeconds, setTimeoutSeconds] = useState((data.timeoutSeconds as number) || 10);
    const [maxRetries, setMaxRetries] = useState((data.maxRetries as number) || 2);
    const [invalidInputMessage, setInvalidInputMessage] = useState(
        (data.invalidInputMessage as string) || "I didn't understand that. Please try again."
    );
    const [retryMessage, setRetryMessage] = useState(
        (data.retryMessage as string) || "Let me repeat the options."
    );

    useEffect(() => {
        onUpdate({
            prompt,
            options,
            inputMethod,
            timeoutSeconds,
            maxRetries,
            invalidInputMessage,
            retryMessage
        });
    }, [
        prompt,
        options,
        inputMethod,
        timeoutSeconds,
        maxRetries,
        invalidInputMessage,
        retryMessage,
        onUpdate
    ]);

    const addOption = () => {
        const newKey = (options.length + 1).toString();
        setOptions([
            ...options,
            {
                key: newKey,
                label: `Option ${newKey}`,
                value: `option${newKey}`
            }
        ]);
    };

    const removeOption = (index: number) => {
        if (options.length > 1) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index: number, field: keyof MenuOption, value: string) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    return (
        <div>
            <FormSection title="Menu Prompt">
                <FormField label="Prompt Message">
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px]"
                        placeholder="Please select an option. Press 1 for sales, 2 for support, or 3 for hours."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Message to play before presenting options
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Menu Options">
                <div className="space-y-3">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className="p-3 border border-border rounded-lg bg-muted/30"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Option {index + 1}
                                </span>
                                {options.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                                        title="Remove option"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">
                                            Key *
                                        </label>
                                        <Input
                                            type="text"
                                            value={option.key}
                                            onChange={(e) =>
                                                updateOption(index, "key", e.target.value)
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">
                                            Value
                                        </label>
                                        <Input
                                            type="text"
                                            value={option.value || ""}
                                            onChange={(e) =>
                                                updateOption(index, "value", e.target.value)
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="sales"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">
                                        Label *
                                    </label>
                                    <Input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) =>
                                            updateOption(index, "label", e.target.value)
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Sales Department"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">
                                        Description
                                    </label>
                                    <Input
                                        type="text"
                                        value={option.description || ""}
                                        onChange={(e) =>
                                            updateOption(index, "description", e.target.value)
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="For new sales inquiries"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addOption}
                        className="w-full py-2 px-3 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                        <Plus className="w-4 h-4" />
                        Add Option
                    </button>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                    <strong>Key:</strong> What user says/presses (e.g., "1", "sales", "yes")
                    <br />
                    <strong>Value:</strong> Internal value stored (optional, defaults to key)
                    <br />
                    <strong>Label:</strong> Display name for this option
                </p>
            </FormSection>

            <FormSection title="Input Settings">
                <FormField label="Input Method">
                    <Select value={inputMethod} onChange={setInputMethod} options={inputMethods} />
                    <p className="text-xs text-muted-foreground mt-1">
                        How users can select options (voice, keypad, or both)
                    </p>
                </FormField>

                <FormField label="Timeout (seconds)">
                    <Slider
                        value={timeoutSeconds}
                        onChange={setTimeoutSeconds}
                        min={5}
                        max={30}
                        step={1}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        How long to wait for user input before timing out (5-30 seconds)
                    </p>
                </FormField>

                <FormField label="Max Retries">
                    <Slider value={maxRetries} onChange={setMaxRetries} min={0} max={5} step={1} />
                    <p className="text-xs text-muted-foreground mt-1">
                        Number of times to retry on invalid input or timeout (0-5 retries)
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Error Messages">
                <FormField label="Invalid Input Message">
                    <Textarea
                        value={invalidInputMessage}
                        onChange={(e) => setInvalidInputMessage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[60px]"
                        placeholder="I didn't understand that. Please try again."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Played when user provides invalid input
                    </p>
                </FormField>

                <FormField label="Retry Message">
                    <Textarea
                        value={retryMessage}
                        onChange={(e) => setRetryMessage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[60px]"
                        placeholder="Let me repeat the options."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Played before repeating the menu on retry
                    </p>
                </FormField>
            </FormSection>
        </div>
    );
}
