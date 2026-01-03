import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface CodeNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" }
];

export function CodeNodeConfig({ data, onUpdate, errors: _errors = [] }: CodeNodeConfigProps) {
    const [language, setLanguage] = useState((data.language as string) || "javascript");
    const [code, setCode] = useState((data.code as string) || "");
    const [timeout, setTimeout] = useState((data.timeout as number) || 30);
    const [memoryLimit, setMemoryLimit] = useState((data.memoryLimit as number) || 256);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            language,
            code,
            timeout,
            memoryLimit,
            outputVariable
        });
    }, [language, code, timeout, memoryLimit, outputVariable]);

    const getPlaceholder = () => {
        switch (language) {
            case "javascript":
            case "typescript":
                return `// Access input variables via 'inputs' object
// Example: const name = inputs.userName;

// Your code here
const result = {
  message: \`Hello \${inputs.name}\`,
  timestamp: new Date().toISOString()
};

// Return output (must be JSON-serializable)
return result;`;
            case "python":
                return `# Access input variables via 'inputs' dict
# Example: name = inputs['userName']

# Your code here
result = {
    "message": f"Hello {inputs['name']}",
    "timestamp": "2024-01-01"
}

# Return output (must be JSON-serializable)
return result`;
            default:
                return "";
        }
    };

    return (
        <div>
            <FormSection title="Language">
                <FormField label="Programming Language">
                    <Select value={language} onChange={setLanguage} options={languages} />
                </FormField>
            </FormSection>

            <FormSection title="Code">
                <FormField
                    label="Code Editor"
                    description="Write your code here. Access inputs via 'inputs' object/dict."
                >
                    <CodeInput
                        value={code}
                        onChange={setCode}
                        language={language === "python" ? "python" : "javascript"}
                        placeholder={getPlaceholder()}
                        rows={16}
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs text-blue-800">
                        <strong>Available:</strong> All standard library functions
                        <br />
                        <strong>Restricted:</strong> Network access, file system, subprocess
                        execution
                    </p>
                </div>
            </FormSection>

            <FormSection title="Resource Limits">
                <FormField label="Timeout (seconds)" description="Maximum execution time">
                    <Input
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(parseInt(e.target.value) || 0)}
                        min={1}
                        max={300}
                    />
                </FormField>

                <FormField label="Memory Limit (MB)" description="Maximum memory allocation">
                    <Input
                        type="number"
                        value={memoryLimit}
                        onChange={(e) => setMemoryLimit(parseInt(e.target.value) || 0)}
                        min={64}
                        max={2048}
                        step={64}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Input/Output">
                <div className="space-y-3">
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs font-semibold text-foreground mb-1">Input Access</p>
                        <code className="text-xs text-muted-foreground font-mono">
                            {language === "python"
                                ? "inputs['variableName']"
                                : "inputs.variableName"}
                        </code>
                    </div>

                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs font-semibold text-foreground mb-1">Output</p>
                        <code className="text-xs text-muted-foreground font-mono">
                            return {language === "python" ? "dict" : "object"} (JSON-serializable)
                        </code>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Code"}
                    nodeType="code"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
