import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { Checkbox } from "../../../components/common/Checkbox";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface SharedMemoryNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const operations = [
    { value: "store", label: "Store" },
    { value: "search", label: "Search" }
];

export function SharedMemoryNodeConfig({
    data,
    onUpdate,
    errors: _errors = []
}: SharedMemoryNodeConfigProps) {
    const [operation, setOperation] = useState((data.operation as string) || "store");
    const [key, setKey] = useState((data.key as string) || "");
    const [value, setValue] = useState((data.value as string) || "");
    const [enableSemanticSearch, setEnableSemanticSearch] = useState(
        (data.enableSemanticSearch as boolean) ?? true
    );
    const [searchQuery, setSearchQuery] = useState((data.searchQuery as string) || "");
    const [topK, setTopK] = useState((data.topK as number) || 5);
    const [similarityThreshold, setSimilarityThreshold] = useState(
        (data.similarityThreshold as number) || 0.7
    );

    useEffect(() => {
        const config: Record<string, unknown> = {
            operation
        };

        if (operation === "store") {
            config.key = key;
            config.value = value;
            config.enableSemanticSearch = enableSemanticSearch;
        }

        if (operation === "search") {
            config.searchQuery = searchQuery;
            config.topK = topK;
            config.similarityThreshold = similarityThreshold;
        }

        onUpdate(config);
    }, [operation, key, value, enableSemanticSearch, searchQuery, topK, similarityThreshold]);

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Type">
                    <Select value={operation} onChange={setOperation} options={operations} />
                </FormField>
            </FormSection>

            {operation === "store" && (
                <>
                    <FormSection title="Store Configuration">
                        <FormField label="Key" description="Unique identifier for this value">
                            <Input
                                type="text"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="e.g., article_summary, user_context"
                                className="font-mono"
                            />
                        </FormField>

                        <FormField
                            label="Value"
                            description="The content to store. Use {{nodeName.field}} to reference other node outputs."
                        >
                            <Textarea
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="{{llm_node.response}}"
                                rows={4}
                                className="font-mono"
                            />
                        </FormField>

                        <FormField
                            label="Searchable"
                            description="Index this value for semantic search (recommended for text content)"
                        >
                            <Checkbox
                                checked={enableSemanticSearch}
                                onCheckedChange={(checked) =>
                                    setEnableSemanticSearch(checked === true)
                                }
                                label="Enable semantic search"
                            />
                        </FormField>
                    </FormSection>

                    <FormSection title="Access">
                        <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                            <p>After storing, access this value in other nodes using:</p>
                            <code className="block mt-2 text-foreground bg-background px-2 py-1 rounded">
                                {`{{shared.${key || "your_key"}}}`}
                            </code>
                        </div>
                    </FormSection>
                </>
            )}

            {operation === "search" && (
                <FormSection title="Search Configuration">
                    <FormField
                        label="Search Query"
                        description="Describe what you're looking for. The search will find semantically similar stored values."
                    >
                        <Textarea
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="e.g., What are the key findings about climate change?"
                            rows={3}
                        />
                    </FormField>

                    <FormField
                        label="Max Results"
                        description="Maximum number of matching results to return"
                    >
                        <Input
                            type="number"
                            value={topK}
                            onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                            min={1}
                            max={50}
                        />
                    </FormField>

                    <FormField
                        label="Similarity Threshold"
                        description="Minimum relevance score (0-1). Higher values return only highly relevant results."
                    >
                        <Input
                            type="number"
                            value={similarityThreshold}
                            onChange={(e) =>
                                setSimilarityThreshold(parseFloat(e.target.value) || 0.7)
                            }
                            min={0}
                            max={1}
                            step={0.1}
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="About Shared Memory">
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                    <p className="text-blue-700 dark:text-blue-400">
                        {operation === "store" ? (
                            <>
                                <strong>Store</strong> saves content that can be retrieved later by
                                key (
                                <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                                    {"{{shared.key}}"}
                                </code>
                                ) or found via semantic search.
                            </>
                        ) : (
                            <>
                                <strong>Search</strong> finds relevant stored content by meaning,
                                not exact key match. Useful for retrieving context in multi-step
                                workflows.
                            </>
                        )}
                    </p>
                </div>
            </FormSection>
        </div>
    );
}
