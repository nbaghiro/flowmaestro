import { Play, Loader2 } from "lucide-react";
import { useState } from "react";
import {
    testSandboxOperation,
    type SandboxFilterableData,
    type SandboxTestResponse
} from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { Button } from "../../common/Button";
import { JsonViewer } from "../../common/JsonViewer";

interface FilterTesterProps {
    provider: string;
    operationId: string;
    filterableData: SandboxFilterableData;
}

/**
 * Filter Tester Component
 *
 * Allows testing filterable operations with custom parameters.
 */
export function FilterTester({ provider, operationId, filterableData }: FilterTesterProps) {
    const [params, setParams] = useState<string>("{}");
    const [paramsError, setParamsError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SandboxTestResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleParamsChange = (value: string) => {
        setParams(value);
        setParamsError(null);

        // Validate JSON
        try {
            JSON.parse(value);
        } catch {
            setParamsError("Invalid JSON");
        }
    };

    const handleTest = async () => {
        setParamsError(null);
        setError(null);
        setResult(null);

        let parsedParams: Record<string, unknown>;
        try {
            parsedParams = JSON.parse(params);
        } catch {
            setParamsError("Invalid JSON");
            return;
        }

        setIsLoading(true);
        try {
            const response = await testSandboxOperation(provider, operationId, parsedParams);
            setResult(response.data);
        } catch (err) {
            logger.error("Filter test failed", err);
            setError(err instanceof Error ? err.message : "Test failed");
        } finally {
            setIsLoading(false);
        }
    };

    // Generate example params based on filter type
    const getExampleParams = (): string => {
        const filterType = filterableData.filterConfig?.type || "generic";
        const pageSizeParam = filterableData.pageSizeParam || "pageSize";

        switch (filterType) {
            case "airtable":
                return JSON.stringify(
                    {
                        [pageSizeParam]: 5,
                        filterByFormula: "{Status} = 'Active'"
                    },
                    null,
                    2
                );
            case "hubspot":
                return JSON.stringify(
                    {
                        [pageSizeParam]: 5,
                        filterGroups: [
                            {
                                filters: [
                                    {
                                        propertyName: "status",
                                        operator: "EQ",
                                        value: "active"
                                    }
                                ]
                            }
                        ]
                    },
                    null,
                    2
                );
            case "generic":
            default:
                return JSON.stringify(
                    {
                        [pageSizeParam]: 5
                    },
                    null,
                    2
                );
        }
    };

    return (
        <div className="space-y-4">
            {/* Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    This operation supports filtering and pagination. Test it with custom parameters
                    below.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded">
                        {filterableData.recordCount} records
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded">
                        Filter type: {filterableData.filterConfig?.type || "generic"}
                    </span>
                    {filterableData.defaultPageSize && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded">
                            Default page: {filterableData.defaultPageSize}
                        </span>
                    )}
                </div>
            </div>

            {/* Parameters Input */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Test Parameters (JSON)
                    </label>
                    <button
                        onClick={() => handleParamsChange(getExampleParams())}
                        className="text-xs text-primary hover:underline"
                    >
                        Load example
                    </button>
                </div>
                <textarea
                    value={params}
                    onChange={(e) => handleParamsChange(e.target.value)}
                    rows={6}
                    className={`w-full p-3 bg-muted/30 border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        paramsError ? "border-red-500" : "border-border"
                    }`}
                    placeholder='{"pageSize": 5}'
                />
                {paramsError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{paramsError}</p>
                )}
            </div>

            {/* Run Button */}
            <Button onClick={handleTest} disabled={isLoading || !!paramsError} className="w-full">
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        Run Test
                    </>
                )}
            </Button>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Response</p>
                        {result.response.success ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-green-500/20 text-emerald-700 dark:text-green-400 rounded">
                                Success
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded">
                                Error
                            </span>
                        )}
                    </div>
                    <JsonViewer
                        data={result.response.data || result.response.error}
                        maxHeight="300px"
                    />
                </div>
            )}

            {/* Sample Records Preview */}
            {filterableData.sampleRecords.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        Sample Records ({filterableData.sampleRecords.length} of{" "}
                        {filterableData.recordCount})
                    </p>
                    <JsonViewer data={filterableData.sampleRecords} maxHeight="300px" collapsed />
                </div>
            )}
        </div>
    );
}
