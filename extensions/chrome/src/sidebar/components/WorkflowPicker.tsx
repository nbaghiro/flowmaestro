import { clsx } from "clsx";
import {
    Search,
    Star,
    Clock,
    Play,
    Loader2,
    Check,
    X,
    Camera,
    FileText,
    ChevronRight
} from "lucide-react";
import { useState } from "react";
import type { ExtensionWorkflowSummary } from "@flowmaestro/shared";
import { useSidebarStore } from "../stores/sidebarStore";

export function WorkflowPicker() {
    const {
        userContext,
        selectedWorkflow,
        setSelectedWorkflow,
        isExecuting,
        executionResult,
        executeWorkflow,
        includePageText,
        includeScreenshot,
        setIncludePageText,
        setIncludeScreenshot,
        captureScreenshot
    } = useSidebarStore();

    const [searchQuery, setSearchQuery] = useState("");

    const workflows = userContext?.workflows || [];
    const pinnedIds = userContext?.pinnedWorkflowIds || [];
    const recentIds = userContext?.recentWorkflowIds || [];

    const pinnedWorkflows = workflows.filter((w) => pinnedIds.includes(w.id));
    const recentWorkflows = workflows.filter(
        (w) => recentIds.includes(w.id) && !pinnedIds.includes(w.id)
    );
    const filteredWorkflows = searchQuery
        ? workflows.filter(
              (w) =>
                  w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  w.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    const renderWorkflowItem = (workflow: ExtensionWorkflowSummary, isPinned = false) => (
        <button
            key={workflow.id}
            onClick={() => setSelectedWorkflow(workflow)}
            className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-lg transition-colors",
                selectedWorkflow?.id === workflow.id && "bg-accent border border-border"
            )}
        >
            {isPinned && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{workflow.name}</div>
                {workflow.description && (
                    <div className="text-xs text-muted-foreground truncate">
                        {workflow.description}
                    </div>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Search */}
            <div className="p-3 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search workflows..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                </div>
            </div>

            {/* Workflow Lists */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {searchQuery ? (
                    /* Search Results */
                    filteredWorkflows.length > 0 ? (
                        <div className="space-y-1">
                            {filteredWorkflows.map((w) => renderWorkflowItem(w))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No workflows found</p>
                        </div>
                    )
                ) : (
                    <>
                        {/* Pinned */}
                        {pinnedWorkflows.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                    <Star className="w-3.5 h-3.5" />
                                    Pinned
                                </h3>
                                <div className="space-y-1">
                                    {pinnedWorkflows.map((w) => renderWorkflowItem(w, true))}
                                </div>
                            </div>
                        )}

                        {/* Recent */}
                        {recentWorkflows.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Recent
                                </h3>
                                <div className="space-y-1">
                                    {recentWorkflows.map((w) => renderWorkflowItem(w))}
                                </div>
                            </div>
                        )}

                        {/* All Workflows */}
                        {workflows.length > 0 &&
                            pinnedWorkflows.length === 0 &&
                            recentWorkflows.length === 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        All Workflows
                                    </h3>
                                    <div className="space-y-1">
                                        {workflows.map((w) => renderWorkflowItem(w))}
                                    </div>
                                </div>
                            )}

                        {workflows.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">
                                    No workflows available
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Page Context Options */}
            <div className="px-3 py-2 border-t border-border bg-muted">
                <div className="text-xs font-medium text-muted-foreground mb-2">Page Context:</div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includePageText}
                            onChange={(e) => setIncludePageText(e.target.checked)}
                            className="w-4 h-4 rounded border-border bg-background"
                        />
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground">Page text</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeScreenshot}
                            onChange={async (e) => {
                                if (e.target.checked) {
                                    await captureScreenshot();
                                }
                                setIncludeScreenshot(e.target.checked);
                            }}
                            className="w-4 h-4 rounded border-border bg-background"
                        />
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground">Screenshot</span>
                    </label>
                </div>
            </div>

            {/* Execution Result */}
            {executionResult && (
                <div
                    className={clsx(
                        "mx-3 mb-3 p-3 rounded-lg",
                        executionResult.status === "completed"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-destructive/10 border border-destructive/20"
                    )}
                >
                    <div className="flex items-center gap-2 mb-1">
                        {executionResult.status === "completed" ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                            <X className="w-4 h-4 text-destructive" />
                        )}
                        <span
                            className={clsx(
                                "text-sm font-medium",
                                executionResult.status === "completed"
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-destructive"
                            )}
                        >
                            {executionResult.status === "completed"
                                ? "Workflow completed"
                                : "Workflow failed"}
                        </span>
                    </div>
                    {executionResult.outputs && (
                        <pre className="text-xs text-muted-foreground overflow-auto max-h-40 mt-2">
                            {JSON.stringify(executionResult.outputs, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            {/* Run Button */}
            <div className="p-3 border-t border-border bg-card">
                <button
                    onClick={executeWorkflow}
                    disabled={!selectedWorkflow || isExecuting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                    {isExecuting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Running...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            <span>Run Selected Workflow</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
