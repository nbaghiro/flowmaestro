/**
 * ValidationErrorsDialog Component
 *
 * Dialog shown when user tries to execute a workflow with validation errors.
 * Displays the list of errors and warnings that need to be fixed.
 */

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";
import type {
    WorkflowValidationIssue,
    WorkflowValidationResult,
    WorkflowValidationSeverity
} from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";

interface ValidationErrorsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    validationResult: WorkflowValidationResult | null;
    nodeNames: Map<string, string>;
    onOpenValidationPanel?: () => void;
}

const severityConfig: Record<
    WorkflowValidationSeverity,
    {
        icon: typeof AlertCircle;
        color: string;
        bgColor: string;
        label: string;
    }
> = {
    error: {
        icon: AlertCircle,
        color: "text-red-500 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        label: "Errors"
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        label: "Warnings"
    },
    info: {
        icon: Info,
        color: "text-blue-500 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        label: "Info"
    }
};

interface IssueItemProps {
    issue: WorkflowValidationIssue;
    nodeName?: string;
}

function IssueItem({ issue, nodeName }: IssueItemProps) {
    const config = severityConfig[issue.severity];
    const Icon = config.icon;

    return (
        <div className="flex items-start gap-3 py-2">
            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                    {issue.nodeId && nodeName && <span className="font-medium">{nodeName}: </span>}
                    {issue.message}
                </p>
                {issue.suggestion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{issue.suggestion}</p>
                )}
            </div>
        </div>
    );
}

export function ValidationErrorsDialog({
    isOpen,
    onClose,
    validationResult,
    nodeNames,
    onOpenValidationPanel
}: ValidationErrorsDialogProps) {
    // Group issues by severity
    const groupedIssues = useMemo(() => {
        if (!validationResult) {
            return { errors: [], warnings: [], info: [] };
        }

        const errors: WorkflowValidationIssue[] = [];
        const warnings: WorkflowValidationIssue[] = [];
        const info: WorkflowValidationIssue[] = [];

        for (const issue of validationResult.allIssues) {
            switch (issue.severity) {
                case "error":
                    errors.push(issue);
                    break;
                case "warning":
                    warnings.push(issue);
                    break;
                case "info":
                    info.push(issue);
                    break;
            }
        }

        return { errors, warnings, info };
    }, [validationResult]);

    const errorCount = groupedIssues.errors.length;
    const warningCount = groupedIssues.warnings.length;

    const handleViewDetails = () => {
        onClose();
        onOpenValidationPanel?.();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Cannot Run Workflow" size="md">
            <div className="space-y-4">
                {/* Summary message */}
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Your workflow has validation issues that must be fixed before running.
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? "s" : ""}`}
                            {errorCount > 0 && warningCount > 0 && ", "}
                            {warningCount > 0 &&
                                `${warningCount} warning${warningCount !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                </div>

                {/* Issues list - show up to 5 errors, then warnings */}
                <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {/* Errors section */}
                    {groupedIssues.errors.length > 0 && (
                        <div className="p-3">
                            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                                Errors ({groupedIssues.errors.length})
                            </h4>
                            <div className="space-y-1">
                                {groupedIssues.errors.slice(0, 5).map((issue) => (
                                    <IssueItem
                                        key={issue.id}
                                        issue={issue}
                                        nodeName={
                                            issue.nodeId ? nodeNames.get(issue.nodeId) : undefined
                                        }
                                    />
                                ))}
                                {groupedIssues.errors.length > 5 && (
                                    <p className="text-xs text-muted-foreground py-1">
                                        ...and {groupedIssues.errors.length - 5} more errors
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Warnings section */}
                    {groupedIssues.warnings.length > 0 && (
                        <div className="p-3">
                            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                                Warnings ({groupedIssues.warnings.length})
                            </h4>
                            <div className="space-y-1">
                                {groupedIssues.warnings.slice(0, 3).map((issue) => (
                                    <IssueItem
                                        key={issue.id}
                                        issue={issue}
                                        nodeName={
                                            issue.nodeId ? nodeNames.get(issue.nodeId) : undefined
                                        }
                                    />
                                ))}
                                {groupedIssues.warnings.length > 3 && (
                                    <p className="text-xs text-muted-foreground py-1">
                                        ...and {groupedIssues.warnings.length - 3} more warnings
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    {onOpenValidationPanel && (
                        <Button variant="secondary" onClick={handleViewDetails}>
                            View All Issues
                        </Button>
                    )}
                    <Button variant="primary" onClick={onClose}>
                        Got it
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
