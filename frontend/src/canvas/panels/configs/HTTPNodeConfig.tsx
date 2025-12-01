import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../../components/common/Button";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface HTTPNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const methods = [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "PATCH", label: "PATCH" },
    { value: "DELETE", label: "DELETE" }
];

const authTypes = [
    { value: "none", label: "None" },
    { value: "basic", label: "Basic Auth" },
    { value: "bearer", label: "Bearer Token" },
    { value: "apiKey", label: "API Key" }
];

const bodyTypes = [
    { value: "json", label: "JSON" },
    { value: "form", label: "Form Data" },
    { value: "raw", label: "Raw" }
];

interface KeyValue {
    key: string;
    value: string;
}

export function HTTPNodeConfig({ data, onUpdate }: HTTPNodeConfigProps) {
    // Helper function to convert object to KeyValue array
    const toKeyValueArray = (obj: unknown): KeyValue[] => {
        if (Array.isArray(obj)) return obj;
        if (obj && typeof obj === "object") {
            return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
        }
        return [];
    };

    const [method, setMethod] = useState((data.method as string) || "GET");
    const [url, setUrl] = useState((data.url as string) || "");
    const [headers, setHeaders] = useState<KeyValue[]>(
        data.headers
            ? toKeyValueArray(data.headers).length > 0
                ? toKeyValueArray(data.headers)
                : [{ key: "", value: "" }]
            : [{ key: "", value: "" }]
    );
    const [queryParams, setQueryParams] = useState<KeyValue[]>(toKeyValueArray(data.queryParams));
    const [authType, setAuthType] = useState((data.authType as string) || "none");
    const [authCredentials, setAuthCredentials] = useState((data.authCredentials as string) || "");
    const [bodyType, setBodyType] = useState((data.bodyType as string) || "json");
    const [body, setBody] = useState((data.body as string) || "");
    const [timeout, setTimeout] = useState((data.timeout as number) || 30);
    const [retryCount, setRetryCount] = useState((data.retryCount as number) || 3);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            method,
            url,
            headers: headers.filter((h) => h.key),
            queryParams: queryParams.filter((q) => q.key),
            authType,
            authCredentials,
            bodyType,
            body,
            timeout,
            retryCount,
            outputVariable
        });
    }, [
        method,
        url,
        headers,
        queryParams,
        authType,
        authCredentials,
        bodyType,
        body,
        timeout,
        retryCount,
        outputVariable
    ]);

    const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
    const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
    const updateHeader = (index: number, field: keyof KeyValue, value: string) => {
        const updated = [...headers];
        updated[index] = { ...updated[index], [field]: value };
        setHeaders(updated);
    };

    const addQueryParam = () => setQueryParams([...queryParams, { key: "", value: "" }]);
    const removeQueryParam = (index: number) =>
        setQueryParams(queryParams.filter((_, i) => i !== index));
    const updateQueryParam = (index: number, field: keyof KeyValue, value: string) => {
        const updated = [...queryParams];
        updated[index] = { ...updated[index], [field]: value };
        setQueryParams(updated);
    };

    return (
        <div>
            <FormSection title="Request">
                <FormField label="Method">
                    <Select value={method} onChange={setMethod} options={methods} />
                </FormField>

                <FormField label="URL" description="Supports ${variableName} interpolation">
                    <Input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.example.com/endpoint"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Headers">
                {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-start min-w-0">
                        <Input
                            type="text"
                            value={header.key}
                            onChange={(e) => updateHeader(index, "key", e.target.value)}
                            placeholder="Header name"
                            className="flex-1 min-w-0 font-mono"
                        />
                        <Input
                            type="text"
                            value={header.value}
                            onChange={(e) => updateHeader(index, "value", e.target.value)}
                            placeholder="Value"
                            className="flex-1 min-w-0 font-mono"
                        />
                        {headers.length > 1 && (
                            <Button
                                variant="icon"
                                onClick={() => removeHeader(index)}
                                className="flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                        )}
                    </div>
                ))}
                <Button variant="secondary" onClick={addHeader} className="w-full">
                    <Plus className="w-4 h-4" />
                    Add Header
                </Button>
            </FormSection>

            {queryParams.length > 0 || method === "GET" ? (
                <FormSection title="Query Parameters">
                    {queryParams.map((param, index) => (
                        <div key={index} className="flex gap-2 items-start min-w-0">
                            <Input
                                type="text"
                                value={param.key}
                                onChange={(e) => updateQueryParam(index, "key", e.target.value)}
                                placeholder="Parameter name"
                                className="flex-1 min-w-0 font-mono"
                            />
                            <Input
                                type="text"
                                value={param.value}
                                onChange={(e) => updateQueryParam(index, "value", e.target.value)}
                                placeholder="Value"
                                className="flex-1 min-w-0 font-mono"
                            />
                            <Button
                                variant="icon"
                                onClick={() => removeQueryParam(index)}
                                className="flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="secondary" onClick={addQueryParam} className="w-full">
                        <Plus className="w-4 h-4" />
                        Add Query Parameter
                    </Button>
                </FormSection>
            ) : null}

            <FormSection title="Authentication">
                <FormField label="Auth Type">
                    <Select value={authType} onChange={setAuthType} options={authTypes} />
                </FormField>

                {authType !== "none" && (
                    <FormField
                        label="Credentials"
                        description={
                            authType === "basic"
                                ? "username:password"
                                : authType === "bearer"
                                  ? "Token value"
                                  : "API key value"
                        }
                    >
                        <Input
                            type="password"
                            value={authCredentials}
                            onChange={(e) => setAuthCredentials(e.target.value)}
                            placeholder={
                                authType === "basic" ? "username:password" : "Token or API key"
                            }
                            className="font-mono"
                        />
                    </FormField>
                )}
            </FormSection>

            {["POST", "PUT", "PATCH"].includes(method) && (
                <FormSection title="Request Body">
                    <FormField label="Body Type">
                        <Select value={bodyType} onChange={setBodyType} options={bodyTypes} />
                    </FormField>

                    <FormField label="Body">
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={
                                bodyType === "json"
                                    ? '{\n  "key": "${value}"\n}'
                                    : "Request body..."
                            }
                            rows={8}
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Settings">
                <FormField label="Timeout (seconds)" description="Maximum request duration">
                    <Input
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(parseInt(e.target.value) || 0)}
                        min={1}
                        max={300}
                    />
                </FormField>

                <FormField label="Retry Count" description="Number of retries on failure">
                    <Input
                        type="number"
                        value={retryCount}
                        onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                        min={0}
                        max={10}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "HTTP"}
                    nodeType="http"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
