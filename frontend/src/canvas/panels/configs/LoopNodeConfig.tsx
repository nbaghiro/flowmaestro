import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { VariableDialog } from "../../../components/VariableDialog";

interface LoopNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const loopTypes = [
    { value: "forEach", label: "For Each (iterate over array)" },
    { value: "while", label: "While (condition-based)" },
    { value: "times", label: "Times (fixed count)" }
];

export function LoopNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors: _errors = []
}: LoopNodeConfigProps) {
    const isInitialMount = useRef(true);
    const [loopType, setLoopType] = useState((data.loopType as string) || "forEach");
    const [arrayVariable, setArrayVariable] = useState((data.arrayVariable as string) || "");
    const [itemVariable, setItemVariable] = useState((data.itemVariable as string) || "item");
    const [indexVariable, setIndexVariable] = useState((data.indexVariable as string) || "index");
    const [condition, setCondition] = useState((data.condition as string) || "");
    const [count, setCount] = useState((data.count as number) || 10);
    const [maxIterations, setMaxIterations] = useState((data.maxIterations as number) || 1000);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [initialVariables, setInitialVariables] = useState<Record<string, unknown>>(
        (data.initialVariables as Record<string, unknown>) || {}
    );
    const [showVariableDialog, setShowVariableDialog] = useState(false);

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            loopType,
            arrayVariable,
            itemVariable,
            indexVariable,
            condition,
            count,
            maxIterations,
            outputVariable,
            initialVariables
        });
    }, [
        loopType,
        arrayVariable,
        itemVariable,
        indexVariable,
        condition,
        count,
        maxIterations,
        outputVariable,
        initialVariables
    ]);

    // Helper functions for initial variables
    const handleAddInitialVariable = () => {
        setShowVariableDialog(true);
    };

    const handleConfirmVariable = (varName: string, initialValue: unknown) => {
        if (varName && !initialVariables[varName]) {
            setInitialVariables({ ...initialVariables, [varName]: initialValue });
        }
    };

    const handleUpdateInitialVariable = (key: string, value: unknown) => {
        setInitialVariables({ ...initialVariables, [key]: value });
    };

    const handleRemoveInitialVariable = (key: string) => {
        const newVars = { ...initialVariables };
        delete newVars[key];
        setInitialVariables(newVars);
    };

    return (
        <div>
            <FormSection title="Loop Type">
                <FormField label="Type">
                    <Select value={loopType} onChange={setLoopType} options={loopTypes} />
                </FormField>
            </FormSection>

            {loopType === "forEach" && (
                <FormSection title="For Each Configuration">
                    <FormField label="Array Variable" description="Array to iterate over">
                        <Input
                            type="text"
                            value={arrayVariable}
                            onChange={(e) => setArrayVariable(e.target.value)}
                            placeholder="${arrayVariable}"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField
                        label="Item Variable Name"
                        description="Variable name for current item"
                    >
                        <Input
                            type="text"
                            value={itemVariable}
                            onChange={(e) => setItemVariable(e.target.value)}
                            placeholder="item"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField
                        label="Index Variable Name"
                        description="Variable name for current index"
                    >
                        <Input
                            type="text"
                            value={indexVariable}
                            onChange={(e) => setIndexVariable(e.target.value)}
                            placeholder="index"
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {loopType === "while" && (
                <>
                    <FormSection title="While Configuration">
                        <FormField
                            label="Condition"
                            description="Loop continues while this evaluates to true"
                        >
                            <CodeInput
                                value={condition}
                                onChange={setCondition}
                                language="javascript"
                                placeholder="${continueAsking} === true"
                                rows={4}
                            />
                        </FormField>
                    </FormSection>

                    <FormSection title="Initial Variables">
                        <FormField
                            label="Set Initial Values"
                            description="Variables to initialize before the loop starts"
                        >
                            <div className="space-y-2">
                                {Object.keys(initialVariables).length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
                                        No initial variables defined
                                    </div>
                                ) : (
                                    Object.entries(initialVariables).map(([key, value]) => (
                                        <div key={key} className="flex items-start gap-2">
                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                <Input
                                                    type="text"
                                                    value={key}
                                                    disabled
                                                    className="px-3 py-2 text-sm bg-muted border border-border rounded-lg font-mono opacity-75"
                                                    placeholder="Variable name"
                                                />
                                                <Input
                                                    type="text"
                                                    value={
                                                        typeof value === "string"
                                                            ? value
                                                            : JSON.stringify(value)
                                                    }
                                                    onChange={(e) => {
                                                        let parsedValue: unknown = e.target.value;
                                                        // Try to parse as boolean
                                                        if (e.target.value === "true")
                                                            parsedValue = true;
                                                        else if (e.target.value === "false")
                                                            parsedValue = false;
                                                        // Try to parse as number
                                                        else if (
                                                            !isNaN(Number(e.target.value)) &&
                                                            e.target.value !== ""
                                                        ) {
                                                            parsedValue = Number(e.target.value);
                                                        }
                                                        handleUpdateInitialVariable(
                                                            key,
                                                            parsedValue
                                                        );
                                                    }}
                                                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                                    placeholder="Initial value"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveInitialVariable(key)}
                                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remove variable"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}

                                <button
                                    onClick={handleAddInitialVariable}
                                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    Add Initial Variable
                                </button>
                            </div>
                        </FormField>

                        <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                            <p className="text-xs text-blue-800">
                                <strong>Tip:</strong> These variables are set once before the loop
                                starts. Use them in your loop condition (e.g.,{" "}
                                <code className="px-1 py-0.5 bg-blue-500/20 dark:bg-blue-400/30 rounded">
                                    continueAsking
                                </code>
                                ).
                            </p>
                        </div>
                    </FormSection>
                </>
            )}

            {loopType === "times" && (
                <FormSection title="Times Configuration">
                    <FormField label="Count" description="Number of times to execute">
                        <Input
                            type="number"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                            min={1}
                            max={10000}
                        />
                    </FormField>

                    <FormField
                        label="Index Variable Name"
                        description="Variable name for current iteration (0-based)"
                    >
                        <Input
                            type="text"
                            value={indexVariable}
                            onChange={(e) => setIndexVariable(e.target.value)}
                            placeholder="index"
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Safety Limits">
                <FormField
                    label="Max Iterations"
                    description="Maximum number of iterations (prevents infinite loops)"
                >
                    <Input
                        type="number"
                        value={maxIterations}
                        onChange={(e) => setMaxIterations(parseInt(e.target.value) || 0)}
                        min={1}
                        max={100000}
                    />
                </FormField>

                <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        <strong>Warning:</strong> Loop will terminate if max iterations is reached.
                    </p>
                </div>
            </FormSection>

            <FormSection title="Loop Body">
                <div className="px-3 py-2 text-xs bg-muted rounded-lg text-muted-foreground">
                    <p>Connect nodes to this loop's output to execute them for each iteration.</p>
                </div>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Loop"}
                    nodeType="loop"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Variable Dialog */}
            <VariableDialog
                open={showVariableDialog}
                onOpenChange={setShowVariableDialog}
                onConfirm={handleConfirmVariable}
                title="Add Initial Variable"
                description="Set a variable that will be available at the start of the loop"
            />
        </div>
    );
}
