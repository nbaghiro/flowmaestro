import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Filter, Loader2 } from "lucide-react";
import { useState } from "react";
import {
    getSandboxFixture,
    type SandboxFixtureSummary,
    type SandboxFixtureDetail
} from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { FilterTester } from "./FilterTester";
import { TestCaseView } from "./TestCaseView";

interface OperationCardProps {
    provider: string;
    operation: SandboxFixtureSummary;
}

/**
 * Operation Card Component
 *
 * Collapsible card showing operation details and test cases.
 */
export function OperationCard({ provider, operation }: OperationCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<SandboxFixtureDetail | null>(null);
    const [activeView, setActiveView] = useState<"cases" | "filter">("cases");

    const totalCases =
        operation.validCaseCount + operation.errorCaseCount + operation.edgeCaseCount;

    const handleToggle = async () => {
        if (expanded) {
            setExpanded(false);
            return;
        }

        // Fetch details if not already loaded
        if (!detail) {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getSandboxFixture(provider, operation.operationId);
                setDetail(response.data);
            } catch (err) {
                logger.error("Failed to load fixture details", err);
                setError(err instanceof Error ? err.message : "Failed to load details");
            } finally {
                setIsLoading(false);
            }
        }

        setExpanded(true);
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={handleToggle}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
            >
                <div className="flex-shrink-0">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : expanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{operation.operationId}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {operation.hasFilterableData && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded"
                            title="Supports filtering"
                        >
                            <Filter className="w-3 h-3" />
                            Filterable
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-green-500/20 text-emerald-700 dark:text-green-400 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        {operation.validCaseCount}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded">
                        <XCircle className="w-3 h-3" />
                        {operation.errorCaseCount}
                    </span>
                    <span className="text-xs text-muted-foreground">{totalCases} cases</span>
                </div>
            </button>

            {/* Content */}
            {expanded && (
                <div className="border-t border-border">
                    {error ? (
                        <div className="p-4">
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md">
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    ) : detail ? (
                        <div className="p-4">
                            {/* View Tabs (if filterable) */}
                            {detail.filterableData && (
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setActiveView("cases")}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                            activeView === "cases"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Test Cases
                                    </button>
                                    <button
                                        onClick={() => setActiveView("filter")}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                            activeView === "filter"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Test with Filters
                                    </button>
                                </div>
                            )}

                            {/* Content */}
                            {activeView === "cases" ? (
                                <TestCaseView
                                    validCases={detail.validCases}
                                    errorCases={detail.errorCases}
                                    edgeCases={detail.edgeCases}
                                />
                            ) : detail.filterableData ? (
                                <FilterTester
                                    provider={provider}
                                    operationId={operation.operationId}
                                    filterableData={detail.filterableData}
                                />
                            ) : null}
                        </div>
                    ) : (
                        <div className="p-4 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
