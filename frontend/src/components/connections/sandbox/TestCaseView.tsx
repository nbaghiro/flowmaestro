import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { JsonViewer } from "../../common/JsonViewer";
import type { SandboxTestCase } from "../../../lib/api";

interface TestCaseViewProps {
    validCases: SandboxTestCase[];
    errorCases: SandboxTestCase[];
    edgeCases?: SandboxTestCase[];
}

type TabType = "valid" | "error" | "edge";

/**
 * Test Case View Component
 *
 * Displays test cases with tabs for valid/error/edge cases.
 */
export function TestCaseView({ validCases, errorCases, edgeCases }: TestCaseViewProps) {
    const [activeTab, setActiveTab] = useState<TabType>("valid");
    const hasEdgeCases = edgeCases && edgeCases.length > 0;

    const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
        {
            key: "valid",
            label: "Valid Cases",
            count: validCases.length,
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        },
        {
            key: "error",
            label: "Error Cases",
            count: errorCases.length,
            icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        }
    ];

    if (hasEdgeCases) {
        tabs.push({
            key: "edge",
            label: "Edge Cases",
            count: edgeCases.length,
            icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        });
    }

    const currentCases =
        activeTab === "valid" ? validCases : activeTab === "error" ? errorCases : edgeCases || [];

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <span
                            className={`px-1.5 py-0.5 text-xs rounded ${
                                activeTab === tab.key ? "bg-primary/20" : "bg-muted"
                            }`}
                        >
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Cases List */}
            <div className="space-y-3">
                {currentCases.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        No {activeTab} cases defined
                    </p>
                ) : (
                    currentCases.map((testCase, index) => (
                        <TestCaseItem
                            key={testCase.name}
                            testCase={testCase}
                            index={index}
                            isError={activeTab === "error"}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface TestCaseItemProps {
    testCase: SandboxTestCase;
    index: number;
    isError: boolean;
}

function TestCaseItem({ testCase, isError }: TestCaseItemProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-border rounded-md overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{testCase.name}</p>
                    {testCase.description && (
                        <p className="text-xs text-muted-foreground truncate">
                            {testCase.description}
                        </p>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="p-4 space-y-4 border-t border-border">
                    {/* Input */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                            Input
                        </p>
                        <JsonViewer data={testCase.input} maxHeight="200px" />
                    </div>

                    {/* Output or Error */}
                    {isError && testCase.expectedError ? (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                Expected Error
                            </p>
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded">
                                        {testCase.expectedError.type}
                                    </span>
                                    {testCase.expectedError.retryable && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">
                                            Retryable
                                        </span>
                                    )}
                                </div>
                                {testCase.expectedError.message && (
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {testCase.expectedError.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : testCase.expectedOutput ? (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                Expected Output
                            </p>
                            <JsonViewer data={testCase.expectedOutput} maxHeight="200px" />
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
