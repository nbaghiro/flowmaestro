/**
 * Web Search Node Configuration Panel
 *
 * Configuration for web search using Tavily API.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface WebSearchNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const SEARCH_TYPE_OPTIONS = [
    { value: "general", label: "General" },
    { value: "news", label: "News" },
    { value: "images", label: "Images" }
];

export function WebSearchNodeConfig({ data, onUpdate, errors = [] }: WebSearchNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Search settings
    const [query, setQuery] = useState<string>((data.query as string) || "");
    const [maxResults, setMaxResults] = useState<number>((data.maxResults as number) || 5);
    const [searchType, setSearchType] = useState<string>((data.searchType as string) || "general");

    // Output
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            query,
            maxResults,
            searchType,
            outputVariable
        });
    }, [query, maxResults, searchType, outputVariable]);

    return (
        <>
            <FormSection title="Search Query">
                <FormField
                    label="Query"
                    description="Search query. Use {{variableName}} for dynamic queries."
                    error={getError("query")}
                >
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="{{userQuery}} or search terms..."
                    />
                </FormField>
            </FormSection>

            <FormSection title="Search Options">
                <FormField label="Search Type">
                    <Select
                        value={searchType}
                        onChange={setSearchType}
                        options={SEARCH_TYPE_OPTIONS}
                    />
                </FormField>

                <FormField label="Max Results" description="Number of results to return (1-20)">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={maxResults}
                            onChange={(e) => setMaxResults(parseInt(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-8">{maxResults}</span>
                    </div>
                </FormField>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Search Results"}
                    nodeType="webSearch"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />

                <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <strong>Output format:</strong>
                    <pre className="mt-1 overflow-x-auto">
                        {`{
  query: "search terms",
  results: [
    { title, url, snippet, publishedDate }
  ]
}`}
                    </pre>
                </div>
            </FormSection>
        </>
    );
}
