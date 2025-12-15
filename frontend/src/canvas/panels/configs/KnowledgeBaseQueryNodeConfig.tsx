import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { getKnowledgeBases, type KnowledgeBase } from "../../../lib/api";

interface KnowledgeBaseQueryNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

export function KnowledgeBaseQueryNodeConfig({
    data,
    onUpdate
}: KnowledgeBaseQueryNodeConfigProps) {
    const [knowledgeBaseId, setKnowledgeBaseId] = useState((data.knowledgeBaseId as string) || "");
    const [queryText, setQueryText] = useState((data.queryText as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Fetch available knowledge bases
    const { data: kbData, isLoading } = useQuery({
        queryKey: ["knowledge-bases"],
        queryFn: async () => {
            const result = await getKnowledgeBases();
            return result.data as KnowledgeBase[];
        }
    });

    useEffect(() => {
        // Find the selected KB name
        const selectedKB = kbData?.find((kb) => kb.id === knowledgeBaseId);

        onUpdate({
            knowledgeBaseId,
            knowledgeBaseName: selectedKB?.name || "",
            queryText,
            outputVariable
        });
    }, [knowledgeBaseId, queryText, outputVariable, kbData]);

    return (
        <div>
            <FormSection title="Knowledge Base">
                <FormField
                    label="Select Knowledge Base"
                    description="Choose which knowledge base to search"
                >
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">
                            Loading knowledge bases...
                        </div>
                    ) : kbData && kbData.length > 0 ? (
                        <Select
                            value={knowledgeBaseId}
                            onChange={setKnowledgeBaseId}
                            options={[
                                { value: "", label: "Select a knowledge base..." },
                                ...kbData.map((kb) => ({
                                    value: kb.id,
                                    label: kb.name
                                }))
                            ]}
                        />
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                No knowledge bases found.
                            </div>
                            <a
                                href="/knowledge-bases"
                                className="inline-block text-sm text-primary hover:underline"
                            >
                                Create your first knowledge base →
                            </a>
                        </div>
                    )}
                </FormField>
            </FormSection>

            <FormSection title="Query">
                <FormField
                    label="Query Text"
                    description="The text to search for. Supports variables like {{input.query}}"
                >
                    <Textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="What is the purpose of this system?
Or use: {{input.question}}"
                        rows={4}
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs text-blue-800">
                        <strong>Tip:</strong> Use variables like{" "}
                        <code className="px-1 bg-blue-500/20 dark:bg-blue-400/30 rounded">
                            {"{{input.query}}"}
                        </code>{" "}
                        to make the query dynamic based on workflow inputs.
                    </p>
                </div>
            </FormSection>

            <FormSection title="Output">
                <div className="space-y-3">
                    <div className="text-sm">
                        <div className="font-medium mb-2">Available Outputs:</div>
                        <div className="space-y-1 text-muted-foreground">
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">results</code> - Array
                                of all matches
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">topResult</code> - Best
                                match
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">combinedText</code> -
                                Formatted text for prompts
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">count</code> - Number
                                of results
                            </div>
                        </div>
                    </div>

                    <OutputSettingsSection
                        nodeName={(data.label as string) || "KB Query"}
                        nodeType="knowledgeBaseQuery"
                        value={outputVariable}
                        onChange={setOutputVariable}
                    />
                </div>
            </FormSection>
        </div>
    );
}
